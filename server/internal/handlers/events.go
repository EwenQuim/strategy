package handlers

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"time"

	"hexmate/server/internal/game"
)

func (h *Handlers) gameEvents(w http.ResponseWriter, r *http.Request) {
	code := r.PathValue("code")
	updates, unsubscribe := h.svc.Subscribe(code)
	defer unsubscribe()
	g, err := h.svc.Game(r.Context(), code)
	if err != nil {
		status := http.StatusInternalServerError
		if errors.Is(err, game.ErrNotFound) {
			status = http.StatusNotFound
		}
		http.Error(w, http.StatusText(status), status)
		return
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache, no-transform")
	w.Header().Set("X-Accel-Buffering", "no")
	controller := http.NewResponseController(w)
	write := func(event string) error {
		if err := controller.SetWriteDeadline(time.Now().Add(30 * time.Second)); err != nil {
			return err
		}
		if _, err := fmt.Fprint(w, event); err != nil {
			return err
		}
		return controller.Flush()
	}
	snapshot := func(g game.Game) error {
		data, err := json.Marshal(publicView(g))
		if err != nil {
			return err
		}
		return write("retry: 2000\ndata: " + string(data) + "\n\n")
	}
	if err := snapshot(g); err != nil {
		return
	}

	heartbeat := time.NewTicker(15 * time.Second)
	defer heartbeat.Stop()
	for {
		select {
		case <-r.Context().Done():
			return
		case <-heartbeat.C:
			if err := write("event: heartbeat\ndata: {}\n\n"); err != nil {
				return
			}
		case <-updates:
			next, err := h.svc.Game(r.Context(), g.Code)
			if err != nil {
				return
			}
			if next.Version != g.Version || next.Status != g.Status {
				if err := snapshot(next); err != nil {
					return
				}
				g = next
			}
		}
	}
}
