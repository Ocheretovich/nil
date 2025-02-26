package network

import (
	"github.com/jonboulle/clockwork"
	dht "github.com/libp2p/go-libp2p-kad-dht"
	"github.com/libp2p/go-libp2p/core/peer"
)

type PeerID = peer.ID

type reputationChangeReason string

const (
	ReputationChangeInvalidBlockSignature = reputationChangeReason("invalid block signature")
)

func DefaultReputationChangeSettings() map[reputationChangeReason]Reputation {
	return map[reputationChangeReason]Reputation{
		ReputationChangeInvalidBlockSignature: -100,
	}
}

type ReputationChangeSettings = map[reputationChangeReason]Reputation

type ConnectionManagerConfig struct {
	DecayReputationPerSecondPercent int                      `yaml:"decayReputationPerSecondPercent,omitempty"`
	ReputationBanThreshold          Reputation               `yaml:"reputationBanThreshold,omitempty"`
	ReputationChangeSettings        ReputationChangeSettings `yaml:"reputationChangeSettings,omitempty"`

	clock clockwork.Clock `yaml:"-"`
}

func DefaultConnectionManagerConfig() ConnectionManagerConfig {
	return ConnectionManagerConfig{
		DecayReputationPerSecondPercent: 2, // A bit low, then 35 seconds to reduce reputation by half
		ReputationBanThreshold:          -200,
		ReputationChangeSettings:        DefaultReputationChangeSettings(),
		clock:                           clockwork.NewRealClock(),
	}
}

type Config struct {
	PrivateKey PrivateKey `yaml:"-"`

	KeysPath string `yaml:"keysPath,omitempty"`

	Prefix      string `yaml:"prefix,omitempty"`
	IPV4Address string `yaml:"ipv4,omitempty"`
	TcpPort     int    `yaml:"tcpPort,omitempty"`
	QuicPort    int    `yaml:"quicPort,omitempty"`

	Relay bool `yaml:"relay,omitempty"`

	DHTEnabled        bool          `yaml:"dhtEnabled,omitempty"`
	DHTBootstrapPeers AddrInfoSlice `yaml:"dhtBootstrapPeers,omitempty"`
	DHTMode           dht.ModeOpt   `yaml:"-,omitempty"`

	ConnectionManagerConfig ConnectionManagerConfig `yaml:"connectionManager,omitempty"`
}

func NewDefaultConfig() *Config {
	return &Config{
		KeysPath:                "network-keys.yaml",
		DHTMode:                 dht.ModeAutoServer,
		Prefix:                  "/nil",
		ConnectionManagerConfig: DefaultConnectionManagerConfig(),
	}
}

func (c *Config) Enabled() bool {
	return c.TcpPort != 0 || c.QuicPort != 0
}
