//go:build tools
// +build tools

//go:generate go build -o ../bin/promtool github.com/prometheus/prometheus/cmd/promtool

package tools

import (
	_ "github.com/prometheus/prometheus/cmd/promtool"
)