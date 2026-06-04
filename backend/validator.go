package backend

import (
	"errors"
	"fmt"
	"path/filepath"
	"regexp"
	"strings"
)

var (
	invalidCharsRe  = regexp.MustCompile(`[\\/:*?"<>|\x00-\x1f]`)
	reservedNames   = map[string]bool{
		"CON": true, "PRN": true, "AUX": true, "NUL": true,
		"COM1": true, "COM2": true, "COM3": true, "COM4": true,
		"COM5": true, "COM6": true, "COM7": true, "COM8": true, "COM9": true,
		"LPT1": true, "LPT2": true, "LPT3": true, "LPT4": true,
		"LPT5": true, "LPT6": true, "LPT7": true, "LPT8": true, "LPT9": true,
	}
)

// ValidateName checks a folder/file name for filesystem safety.
// Returns (true, "") on success, (false, reason) on failure.
func ValidateName(name string) (bool, string) {
	if strings.TrimSpace(name) == "" {
		return false, "Il nome non può essere vuoto."
	}
	if len(name) > 200 {
		return false, "Il nome supera i 200 caratteri."
	}
	if invalidCharsRe.MatchString(name) {
		return false, `Il nome contiene caratteri non validi: \ / : * ? " < > |`
	}
	if strings.HasSuffix(name, ".") || strings.HasSuffix(name, " ") {
		return false, "Il nome non può terminare con '.' o spazio."
	}
	if strings.Contains(name, "..") {
		return false, "Il nome non può contenere '..'."
	}
	upper := strings.ToUpper(name)
	// Strip extension for reserved name check
	baseName := strings.TrimSuffix(upper, filepath.Ext(upper))
	if reservedNames[baseName] {
		return false, fmt.Sprintf("'%s' è un nome riservato di Windows.", name)
	}
	return true, ""
}

// ValidateTree recursively validates the entire node tree.
func ValidateTree(nodes []Node, depth int) error {
	if depth > 50 {
		return errors.New("struttura troppo profonda (max 50 livelli)")
	}
	for _, n := range nodes {
		if ok, reason := ValidateName(n.Name); !ok {
			return fmt.Errorf("nome non valido '%s': %s", n.Name, reason)
		}
		if err := ValidateTree(n.Children, depth+1); err != nil {
			return err
		}
	}
	return nil
}

// IsSafePath ensures target is strictly under base (prevents path traversal).
func IsSafePath(base, target string) bool {
	absBase, err := filepath.Abs(base)
	if err != nil {
		return false
	}
	absTarget, err := filepath.Abs(target)
	if err != nil {
		return false
	}
	return strings.HasPrefix(absTarget, absBase+string(filepath.Separator)) ||
		absTarget == absBase
}
