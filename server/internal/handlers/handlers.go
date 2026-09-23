package handlers

import (
	"errors"
	"net/http"

	"github.com/go-fuego/fuego"

	"hexmate/server/internal/game"
	"hexmate/server/internal/service"
)

type createGameRequest struct {
	Name string `json:"name" description:"Player name, 1 to 20 characters"`
}

type joinGameRequest struct {
	Name string `json:"name" description:"Player name, 1 to 20 characters"`
}

type playActionRequest struct {
	Token   string            `json:"token" description:"Player token received at game creation or join"`
	Version int               `json:"version" description:"Game version the action applies to"`
	Action  game.EngineAction `json:"action" description:"Game engine action"`
	Winner  *game.Side        `json:"winner" description:"Side of the winner, only on the final action"`
}

type healthResponse struct {
	Status string `json:"status"`
}

type publicGame struct {
	Code       string        `json:"code"`
	Status     game.Status   `json:"status"`
	Version    int           `json:"version"`
	Seed       string        `json:"seed"`
	NamePlayer string        `json:"namePlayer"`
	NameEnemy  string        `json:"nameEnemy"`
	Winner     *game.Side    `json:"winner"`
	Actions    []game.Action `json:"actions"`
}

type playerCredentials struct {
	Token string     `json:"token"`
	Side  game.Side  `json:"side"`
	Game  publicGame `json:"game"`
}

type playActionResponse struct {
	Version int `json:"version"`
}

func Register(s *fuego.Server, svc *service.Service) {
	api := fuego.Group(s, "/api")
	fuego.Get(api, "/health", func(fuego.ContextNoBody) (healthResponse, error) {
		return healthResponse{Status: "ok"}, nil
	},
		fuego.OptionOperationID("health"), fuego.OptionSummary("Health check"), fuego.OptionTags("health"))
	errorResponse := func(status int, description string) fuego.RouteOption {
		return fuego.OptionAddResponse(status, description, fuego.Response{Type: fuego.HTTPError{}})
	}
	fuego.Post(api, "/games", createGame(svc),
		fuego.OptionOperationID("createGame"), fuego.OptionSummary("Create a game"),
		fuego.OptionTags("games"), fuego.OptionDefaultStatusCode(http.StatusCreated))
	fuego.Post(api, "/games/{code}/join", joinGame(svc),
		fuego.OptionOperationID("joinGame"), fuego.OptionSummary("Join a game"), fuego.OptionTags("games"),
		errorResponse(http.StatusNotFound, "No game with this code"),
		errorResponse(http.StatusConflict, "Game already has two players"))
	fuego.Get(api, "/games/{code}", getGame(svc),
		fuego.OptionOperationID("getGame"), fuego.OptionSummary("Get a game"), fuego.OptionTags("games"),
		errorResponse(http.StatusNotFound, "No game with this code"))
	fuego.Post(api, "/games/{code}/actions", playAction(svc),
		fuego.OptionOperationID("playAction"), fuego.OptionSummary("Submit a game action"), fuego.OptionTags("games"),
		errorResponse(http.StatusUnauthorized, "Token is not a participant"),
		errorResponse(http.StatusNotFound, "No game with this code"),
		errorResponse(http.StatusConflict, "Version mismatch, resync from the current game"),
		errorResponse(http.StatusUnprocessableEntity, "Game is waiting or finished"))
}

func createGame(svc *service.Service) func(c fuego.ContextWithBody[createGameRequest]) (playerCredentials, error) {
	return func(c fuego.ContextWithBody[createGameRequest]) (playerCredentials, error) {
		req, err := c.Body()
		if err != nil {
			return playerCredentials{}, err
		}
		creds, err := svc.Create(c.Context(), req.Name)
		if err != nil {
			return playerCredentials{}, httpError(err)
		}
		return playerCredentials{Token: creds.Token, Side: creds.Side, Game: publicView(creds.Game)}, nil
	}
}

func joinGame(svc *service.Service) func(c fuego.ContextWithBody[joinGameRequest]) (playerCredentials, error) {
	return func(c fuego.ContextWithBody[joinGameRequest]) (playerCredentials, error) {
		req, err := c.Body()
		if err != nil {
			return playerCredentials{}, err
		}
		creds, err := svc.Join(c.Context(), c.PathParam("code"), req.Name)
		if err != nil {
			return playerCredentials{}, httpError(err)
		}
		return playerCredentials{Token: creds.Token, Side: creds.Side, Game: publicView(creds.Game)}, nil
	}
}

func getGame(svc *service.Service) func(c fuego.ContextNoBody) (publicGame, error) {
	return func(c fuego.ContextNoBody) (publicGame, error) {
		g, err := svc.Game(c.Context(), c.PathParam("code"))
		if err != nil {
			return publicGame{}, httpError(err)
		}
		return publicView(g), nil
	}
}

func playAction(svc *service.Service) func(c fuego.ContextWithBody[playActionRequest]) (playActionResponse, error) {
	return func(c fuego.ContextWithBody[playActionRequest]) (playActionResponse, error) {
		req, err := c.Body()
		if err != nil {
			return playActionResponse{}, err
		}
		var winner *game.Side
		if req.Winner != nil {
			side, ok := game.ParseSide(string(*req.Winner))
			if !ok {
				return playActionResponse{}, fuego.BadRequestError{Detail: "winner must be player or enemy"}
			}
			winner = &side
		}
		g, err := svc.Play(c.Context(), c.PathParam("code"), req.Token, req.Version, req.Action, winner)
		if err != nil {
			return playActionResponse{}, httpError(err)
		}
		return playActionResponse{Version: g.Version}, nil
	}
}

func publicView(g game.Game) publicGame {
	return publicGame{
		Code:       g.Code,
		Status:     g.Status,
		Version:    g.Version,
		Seed:       g.Seed,
		NamePlayer: g.NamePlayer,
		NameEnemy:  g.NameEnemy,
		Winner:     g.Winner,
		Actions:    g.Actions,
	}
}

func httpError(err error) error {
	switch {
	case errors.Is(err, game.ErrNotFound):
		return fuego.NotFoundError{Err: err}
	case errors.Is(err, game.ErrNotParticipant):
		return fuego.UnauthorizedError{Err: err}
	case errors.Is(err, game.ErrAlreadyJoined), errors.Is(err, game.ErrVersionConflict):
		return fuego.ConflictError{Err: err}
	case errors.Is(err, game.ErrNotStarted), errors.Is(err, game.ErrFinished):
		return fuego.HTTPError{Status: http.StatusUnprocessableEntity, Err: err}
	}
	return fuego.BadRequestError{Err: err}
}
