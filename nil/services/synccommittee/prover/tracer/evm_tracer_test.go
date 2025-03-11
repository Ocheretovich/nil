package tracer

import (
	"errors"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestCollectErrors(t *testing.T) {
	t.Parallel()
	tracer := NewTracer(nil)
	err1 := errors.New("error1")
	err2 := errors.New("error2")
	tracer.tracingErrors = []error{err1, err2}
	err := tracer.CollectErrors()
	require.Error(t, err)
	var aggErr *AggregatedError
	require.ErrorAs(t, err, &aggErr)
	require.Len(t, aggErr.Errors, 2)
	require.ErrorIs(t, err, err1)
	require.ErrorIs(t, err, err2)
}
