//go:build !windows

package backend

import "strings"

// isHidden reports whether an entry is hidden. On Unix-like systems that is the
// dot-prefix convention.
func isHidden(_ string, name string) bool {
	return strings.HasPrefix(name, ".")
}
