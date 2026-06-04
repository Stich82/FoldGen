//go:build windows

package backend

import (
	"strings"
	"syscall"
)

// isHidden reports whether an entry is hidden. On Windows that means either the
// dot-prefix convention or the FILE_ATTRIBUTE_HIDDEN filesystem attribute.
func isHidden(path string, name string) bool {
	if strings.HasPrefix(name, ".") {
		return true
	}
	p, err := syscall.UTF16PtrFromString(path)
	if err != nil {
		return false
	}
	attrs, err := syscall.GetFileAttributes(p)
	if err != nil {
		return false
	}
	return attrs&syscall.FILE_ATTRIBUTE_HIDDEN != 0
}
