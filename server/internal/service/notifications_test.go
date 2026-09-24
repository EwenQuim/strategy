package service

import (
	"sync"
	"testing"
)

func TestSubscriptions(t *testing.T) {
	svc := New(nil)
	first, unsubscribeFirst := svc.Subscribe("GAME01")
	second, unsubscribeSecond := svc.Subscribe("GAME01")
	other, unsubscribeOther := svc.Subscribe("GAME02")

	svc.notify("GAME01")
	svc.notify("GAME01")
	if len(first) != 1 || len(second) != 1 || len(other) != 0 {
		t.Fatal("updates must reach every subscriber of that game and coalesce for slow readers")
	}
	<-first
	<-second
	unsubscribeFirst()
	unsubscribeFirst()
	svc.notify("GAME01")
	if len(first) != 0 || len(second) != 1 {
		t.Fatal("unsubscribing must not affect the remaining subscribers")
	}
	unsubscribeSecond()
	unsubscribeOther()
	if len(svc.subscribers) != 0 {
		t.Fatal("unsubscribing must remove empty game entries")
	}
}

func TestConcurrentSubscriptions(t *testing.T) {
	svc := New(nil)
	var wg sync.WaitGroup
	for range 8 {
		wg.Go(func() {
			for range 100 {
				_, unsubscribe := svc.Subscribe("GAME01")
				svc.notify("GAME01")
				unsubscribe()
			}
		})
	}
	wg.Wait()
	if len(svc.subscribers) != 0 {
		t.Fatal("subscriptions leaked")
	}
}
