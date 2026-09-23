package handlers

import (
	"context"
	"errors"
	"net/http"
	"strings"
	"unicode/utf8"

	"github.com/go-fuego/fuego"
	"github.com/go-fuego/fuego/option"

	"hexmate/server/internal/game"
	"hexmate/server/internal/service"
)

type createGameRequest struct {
	Name string `json:"name" description:"Player name, 1 to 20 characters"`
}

func (r *createGameRequest) InTransform(_ context.Context) error {
	return normalizeName(&r.Name)
}

type joinGameRequest struct {
	Name string `json:"name" description:"Player name, 1 to 20 characters"`
}

func (r *joinGameRequest) InTransform(_ context.Context) error {
	return normalizeName(&r.Name)
}

func normalizeName(name *string) error {
	*name = strings.TrimSpace(*name)
	if n := utf8.RuneCountInString(*name); n < 1 || n > 20 {
		return errors.New("name must be 1 to 20 characters")
	}
	return nil
}

type playActionRequest struct {
	Token   string            `json:"token" description:"Player token received at game creation or join"`
	Version int               `json:"version" description:"Game version the action applies to"`
	Action  game.EngineAction `json:"action" description:"Game engine action"`
	Winner  *game.Side        `json:"winner" description:"Side of the winner, only on the final action"`
}

func (r *playActionRequest) InTransform(_ context.Context) error {
	if err := r.Action.Validate(); err != nil {
		return err
	}
	if r.Winner != nil {
		if _, ok := game.ParseSide(string(*r.Winner)); !ok {
			return errors.New("winner must be player or enemy")
		}
	}
	return nil
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

// Handlers binds the game service to HTTP. Register wires its methods as
// fuego controllers.
type Handlers struct {
	svc *service.Service
}

func Register(s *fuego.Server, svc *service.Service) {
	h := &Handlers{svc: svc}
	api := fuego.Group(s, "/api")

	fuego.Get(api, "/health", h.health,
		option.OperationID("health"), option.Summary("Health check"), option.Tags("health"))

	fuego.Post(api, "/games", h.createGame,
		option.OperationID("createGame"), option.Summary("Create a game"),
		option.Tags("games"), option.DefaultStatusCode(http.StatusCreated))

	fuego.Post(api, "/games/{code}/join", h.joinGame,
		option.OperationID("joinGame"), option.Summary("Join a game"), option.Tags("games"),
		option.AddResponse(http.StatusNotFound, "No game with this code", fuego.Response{Type: fuego.HTTPError{}}),
		option.AddResponse(http.StatusConflict, "Game already has two players", fuego.Response{Type: fuego.HTTPError{}}))

	fuego.Get(api, "/games/{code}", h.getGame,
		option.OperationID("getGame"), option.Summary("Get a game"), option.Tags("games"),
		option.AddResponse(http.StatusNotFound, "No game with this code", fuego.Response{Type: fuego.HTTPError{}}))

	fuego.Post(api, "/games/{code}/actions", h.playAction,
		option.OperationID("playAction"), option.Summary("Submit a game action"), option.Tags("games"),
		option.AddResponse(http.StatusUnauthorized, "Token is not a participant", fuego.Response{Type: fuego.HTTPError{}}),
		option.AddResponse(http.StatusNotFound, "No game with this code", fuego.Response{Type: fuego.HTTPError{}}),
		option.AddResponse(http.StatusConflict, "Version mismatch, resync from the current game", fuego.Response{Type: fuego.HTTPError{}}),
		option.AddResponse(http.StatusUnprocessableEntity, "Game is waiting or finished", fuego.Response{Type: fuego.HTTPError{}}))
}

func (h *Handlers) health(fuego.ContextNoBody) (healthResponse, error) {
	return healthResponse{Status: "ok"}, nil
}

func (h *Handlers) createGame(c fuego.ContextWithBody[createGameRequest]) (playerCredentials, error) {
	req, err := c.Body()
	if err != nil {
		return playerCredentials{}, err
	}
	creds, err := h.svc.Create(c.Context(), req.Name)
	if err != nil {
		return playerCredentials{}, httpError(err)
	}
	return playerCredentials{Token: creds.Token, Side: creds.Side, Game: publicView(creds.Game)}, nil
}

func (h *Handlers) joinGame(c fuego.ContextWithBody[joinGameRequest]) (playerCredentials, error) {
	req, err := c.Body()
	if err != nil {
		return playerCredentials{}, err
	}
	creds, err := h.svc.Join(c.Context(), c.PathParam("code"), req.Name)
	if err != nil {
		return playerCredentials{}, httpError(err)
	}
	return playerCredentials{Token: creds.Token, Side: creds.Side, Game: publicView(creds.Game)}, nil
}

func (h *Handlers) getGame(c fuego.ContextNoBody) (publicGame, error) {
	g, err := h.svc.Game(c.Context(), c.PathParam("code"))
	if err != nil {
		return publicGame{}, httpError(err)
	}
	return publicView(g), nil
}

func (h *Handlers) playAction(c fuego.ContextWithBody[playActionRequest]) (playActionResponse, error) {
	req, err := c.Body()
	if err != nil {
		return playActionResponse{}, err
	}
	var winner *game.Side
	if req.Winner != nil {
		side := *req.Winner
		winner = &side
	}
	g, err := h.svc.Play(c.Context(), c.PathParam("code"), req.Token, req.Version, req.Action, winner)
	if err != nil {
		return playActionResponse{}, httpError(err)
	}
	return playActionResponse{Version: g.Version}, nil
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
