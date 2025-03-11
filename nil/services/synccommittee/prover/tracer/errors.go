package tracer

import (
	"errors"
	"strings"
)

var (
	ErrCantProofGenesisBlock   = errors.New("can't prove genesis block")
	ErrTraceNotFinalized       = errors.New("trace logic malformed: previous opcode not finalized")
	ErrTracedBlockHashMismatch = errors.New("generated traced block and fetched block hashes are not equal")
	ErrClientReturnedNilBlock  = errors.New("client returned nil block")
)

type AggregatedError struct {
	Errors []error
}

func (ae *AggregatedError) Error() string {
	msgs := make([]string, 0, len(ae.Errors))
	for _, err := range ae.Errors {
		msgs = append(msgs, err.Error())
	}
	return strings.Join(msgs, "; ")
}

func (ae *AggregatedError) Is(target error) bool {
	for _, err := range ae.Errors {
		if errors.Is(err, target) {
			return true
		}
	}
	return false
}
