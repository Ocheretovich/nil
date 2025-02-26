package network

import (
	"context"
	"math"
	"sync"
	"time"

	"github.com/jonboulle/clockwork"
	libp2pconnmgr "github.com/libp2p/go-libp2p/core/connmgr"
	"github.com/libp2p/go-libp2p/core/host"
	"github.com/libp2p/go-libp2p/core/network"
	"github.com/libp2p/go-libp2p/core/peer"
	"github.com/libp2p/go-libp2p/p2p/net/connmgr"
	ma "github.com/multiformats/go-multiaddr"
	"github.com/rs/zerolog"
)

type WithCustomNotifeeDecorator struct {
	libp2pconnmgr.ConnManager

	notifee network.Notifiee
}

func (cm *WithCustomNotifeeDecorator) Notifee() network.Notifiee {
	return cm.notifee
}

var _ libp2pconnmgr.ConnManager = (*WithCustomNotifeeDecorator)(nil)

type reputationChange struct {
	value  Reputation
	reason reputationChangeReason
}

type PeerReputationTracker interface {
	ReportPeer(peer.ID, reputationChangeReason)
}

// With a normal peerInfo life cycle, it is created when connecting to the peer.
// At this moment, we have access to network, respectively, we can remember the close function
// that requires access to it.
// This is important because we will want to disconnect from the peer at the time
// of a decrease in the reputation below the threshold,
// and in this context we no longer have access to the network.
// Nevertheless, if for some reason the command to reduce the reputation for the peer
// will come to its connection, then we will not have closeFunc.
// This is not scary, since we are not yet connected to the peer and do not need to do anything.
// If later an attempt to connect will occur, then we will install closeFunc
// and will be able to use it if necessary.
type peerInfo struct {
	id         peer.ID
	reputation Reputation
	closeFunc  func()
}

func (pi *peerInfo) closePeer(logger zerolog.Logger) {
	if pi.closeFunc != nil {
		logger.Debug().Stringer("peerId", pi.id).Msg("Disconnecting banned peer")
		pi.closeFunc()
	} else {
		logger.Warn().Msg("Trying to close peer which wasn't ever connected")
	}
}

func newPeerInfo(peerId peer.ID, reputation Reputation, closePeer func()) *peerInfo {
	return &peerInfo{
		id:         peerId,
		reputation: reputation,
		closeFunc:  closePeer,
	}
}

type notifiee struct {
	basicNotifee network.Notifiee

	connectionManagerConfig ConnectionManagerConfig // +checklocksignore: constant

	peerReputations  map[peer.ID]*peerInfo // +checklocks:mu
	lastUpdateSecond int64                 // +checklocks:mu
	mu               sync.Mutex

	logger zerolog.Logger // +checklocksignore: thread safe
}

func (n *notifiee) Listen(network network.Network, address ma.Multiaddr) {
	n.basicNotifee.Listen(network, address)
}

func (n *notifiee) ListenClose(network network.Network, address ma.Multiaddr) {
	n.basicNotifee.ListenClose(network, address)
}

func (n *notifiee) Connected(network network.Network, connection network.Conn) {
	n.basicNotifee.Connected(network, connection)

	peer := connection.RemotePeer()

	n.mu.Lock()
	defer n.mu.Unlock()

	n.recalculateReputationsAccordingToCurrentTime()

	closeFunc := func() {
		if err := network.ClosePeer(peer); err != nil {
			n.logger.Error().Err(err).Msgf("Failed to close peer %s", peer)
		}
	}
	var pi *peerInfo
	var ok bool
	if pi, ok = n.peerReputations[peer]; !ok {
		pi = newPeerInfo(peer, 0, closeFunc)
		n.peerReputations[peer] = pi
	} else if pi.closeFunc == nil {
		pi.closeFunc = closeFunc
	}

	if n.isBanned(pi) {
		pi.closePeer(n.logger)
	}
}

func (n *notifiee) Disconnected(network network.Network, connection network.Conn) {
	n.basicNotifee.Disconnected(network, connection)
}

func (n *notifiee) isBanned(pi *peerInfo) bool {
	return pi.reputation < n.connectionManagerConfig.ReputationBanThreshold
}

func (n *notifiee) ReportPeer(peer peer.ID, reputationChangeReason reputationChangeReason) {
	n.mu.Lock()
	defer n.mu.Unlock()

	n.recalculateReputationsAccordingToCurrentTime()

	pi, ok := n.peerReputations[peer]
	if !ok {
		pi = newPeerInfo(peer, 0, nil)
		n.peerReputations[peer] = pi
	}

	if reputationChange := n.getReputationChange(reputationChangeReason); reputationChange.value != 0 {
		n.logger.Debug().
			Stringer("peerId", peer).
			Int32("diff", int32(reputationChange.value)).
			Str("reason", string(reputationChange.reason)).
			Msg("Changing peer reputation")
		pi.reputation = pi.reputation.add(n.getReputationChange(reputationChangeReason).value)

		if n.isBanned(pi) {
			pi.closePeer(n.logger)
		}
	}
}

func (n *notifiee) getReputationChange(reason reputationChangeReason) reputationChange {
	if value, ok := n.connectionManagerConfig.ReputationChangeSettings[reason]; ok {
		return reputationChange{value: value, reason: reason}
	} else {
		n.logger.Error().Str("reason", string(reason)).Msg("Unknown reputation change reason")
	}
	return reputationChange{}
}

// Reputation represents reputation value of the node
type Reputation int32

// add handles overflow and underflow condition while adding two Reputation values.
func (r Reputation) add(num Reputation) Reputation {
	if num > 0 {
		if r > math.MaxInt32-num {
			return math.MaxInt32
		}
	} else if r < math.MinInt32-num {
		return math.MinInt32
	}
	return r + num
}

// sub handles underflow condition while subtracting two Reputation values.
func (r Reputation) sub(num Reputation) Reputation {
	if num < 0 {
		if r > math.MaxInt32+num {
			return math.MaxInt32
		}
	} else if r < math.MinInt32+num {
		return math.MinInt32
	}
	return r - num
}

// calculateDecayPercent (t, p) calculates the percentage of the decrease
// that needs to be used on each tick, so that for ticks the reputation
// falls approximately to the share of p (p from 0 to 1).
// The whole number of percent is returned (rounding up).
func calculateDecayPercent(t int, p float64) int {
	// fraction = 1 - p^(1/T), This is the part of the reputation (in shares),
	// which needs to be "cut" in one tick.
	fraction := 1.0 - math.Pow(p, 1.0/float64(t))

	// We convert a share of interest and round up
	percent := int(math.Ceil(fraction * 100.0))

	if percent < 1 {
		percent = 1
	}
	return percent
}

// TODO: comment
func (n *notifiee) reputationTick(reput Reputation) Reputation {
	diff := Reputation(int(reput) / (100 / n.connectionManagerConfig.DecayReputationPerSecondPercent))
	if diff == 0 && reput < 0 {
		diff = -1
	} else if diff == 0 && reput > 0 {
		diff = 1
	}
	return reput.sub(diff)
}

// +checklocks:n.mu
func (n *notifiee) recalculateReputationsAccordingToCurrentTime() {
	currentSecond := n.clock().Now().Unix()
	elapsedSeconds := currentSecond - n.lastUpdateSecond
	n.lastUpdateSecond = currentSecond

	for range elapsedSeconds {
		for _, info := range n.peerReputations {
			info.reputation = n.reputationTick(info.reputation)
		}
	}
	// TODO: We should remove NOT CONNECTED peers with reputation 0.
}

func (n *notifiee) start(ctx context.Context) {
	go func() {
		ticker := n.clock().NewTicker(time.Second)
		defer ticker.Stop()

		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.Chan():
				func() {
					n.mu.Lock()
					defer n.mu.Unlock()

					n.recalculateReputationsAccordingToCurrentTime()
				}()
			}
		}
	}()
}

func (n *notifiee) clock() clockwork.Clock {
	return n.connectionManagerConfig.clock
}

func newNotifiee(
	basicNotifee network.Notifiee,
	connectionManagerConfig ConnectionManagerConfig,
	logger zerolog.Logger,
) *notifiee {
	return &notifiee{
		basicNotifee:            basicNotifee,
		connectionManagerConfig: connectionManagerConfig,
		peerReputations:         make(map[peer.ID]*peerInfo),
		lastUpdateSecond:        connectionManagerConfig.clock.Now().Unix(),
		logger:                  logger,
	}
}

var _ network.Notifiee = (*notifiee)(nil)

func newConnectionManagerWithPeerReputationTracking(
	ctx context.Context,
	conf *Config,
	logger zerolog.Logger,
	low, hi int,
	opts ...connmgr.Option,
) (libp2pconnmgr.ConnManager, error) {
	baseConnectionManager, err := connmgr.NewConnManager(low, hi, opts...)
	if err != nil {
		return nil, err
	}
	notifee := newNotifiee(baseConnectionManager.Notifee(), conf.ConnectionManagerConfig, logger)
	notifee.start(ctx)
	return &WithCustomNotifeeDecorator{
		ConnManager: baseConnectionManager,
		notifee:     notifee,
	}, nil
}

func TryGetPeerReputationTracker(host host.Host) PeerReputationTracker {
	notifee, ok := host.ConnManager().Notifee().(*notifiee)
	if !ok {
		return nil
	}
	return notifee
}
