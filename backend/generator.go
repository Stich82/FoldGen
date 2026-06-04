package backend

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// CreateStructure recursively creates the folder hierarchy on disk.
// It ensures basePath itself exists first, so an empty tree still creates the
// project root and a root containing only files works.
//
// SAFETY: FoldGen never writes files to disk. File nodes (IsFile == true) are
// never created — they are skipped and counted. This guarantees we can never
// truncate or overwrite a real existing file. Only os.MkdirAll is used, which
// is non-destructive (an existing folder is left untouched).
//
// Returns the number of file nodes that were skipped, so the caller can warn
// the user that those entries were ignored.
func CreateStructure(basePath string, nodes []Node) (int, error) {
	if err := os.MkdirAll(basePath, 0o755); err != nil {
		return 0, err
	}
	skipped := 0
	for _, node := range nodes {
		if ok, reason := ValidateName(node.Name); !ok {
			return skipped, fmt.Errorf("nome non valido '%s': %s", node.Name, reason)
		}
		// Never create files: skip and count them. We don't even touch the disk
		// for file nodes, so no path/traversal check is needed here.
		if node.IsFile {
			skipped++
			continue
		}
		target := filepath.Join(basePath, node.Name)
		if !IsSafePath(basePath, target) {
			return skipped, fmt.Errorf("path traversal rilevato: %s", node.Name)
		}
		if err := os.MkdirAll(target, 0o755); err != nil {
			return skipped, err
		}
		childSkipped, err := CreateStructure(target, node.Children)
		skipped += childSkipped
		if err != nil {
			return skipped, err
		}
	}
	return skipped, nil
}

// GenerateBat writes a Windows .bat file that recreates the folder structure.
// Returns the path of the generated file.
func GenerateBat(projectName, outputPath string, nodes []Node) (string, error) {
	safeName := batEscape(projectName)
	var sb strings.Builder
	sb.WriteString("@echo off\r\n")
	sb.WriteString(fmt.Sprintf("title %s\r\n", safeName))
	sb.WriteString("echo.\r\n")
	sb.WriteString(fmt.Sprintf("md \"%s\"\r\n", safeName))
	sb.WriteString(fmt.Sprintf("cd \"%s\"\r\n\r\n", safeName))

	writeBatLines(&sb, nodes, 1)

	sb.WriteString("\r\necho.\r\necho Done!\r\npause\r\n")

	outFile := filepath.Join(outputPath, fmt.Sprintf("create_%s.bat", safeName))
	if err := os.WriteFile(outFile, []byte(sb.String()), 0o644); err != nil {
		return "", err
	}
	return outFile, nil
}

func batEscape(s string) string {
	replacer := strings.NewReplacer(
		"&", "", "|", "", "<", "", ">", "", "^", "", "%", "", `"`, "",
	)
	return replacer.Replace(s)
}

func writeBatLines(sb *strings.Builder, nodes []Node, depth int) {
	indent := strings.Repeat("    ", depth)
	for _, node := range nodes {
		// SAFETY: generated scripts create folders only, never files.
		if node.IsFile {
			continue
		}
		safe := batEscape(node.Name)
		sb.WriteString(fmt.Sprintf("%smd \"%s\"\r\n", indent, safe))
		if len(node.Children) > 0 {
			sb.WriteString(fmt.Sprintf("%scd \"%s\"\r\n", indent, safe))
			writeBatLines(sb, node.Children, depth+1)
			sb.WriteString(fmt.Sprintf("%scd ..\r\n", indent))
		}
	}
}

// GenerateSh writes a POSIX shell script that recreates the folder structure.
// Uses flat mkdir -p paths with single-quoted names for safety.
// Returns the path of the generated file.
func GenerateSh(projectName, outputPath string, nodes []Node) (string, error) {
	safeName := sanitizeSh(projectName)
	var sb strings.Builder
	sb.WriteString("#!/usr/bin/env sh\nset -e\n\n")
	sb.WriteString(fmt.Sprintf("mkdir -p '%s'\n\n", safeName))

	writeShLines(&sb, nodes, safeName)

	sb.WriteString("\necho Done!\n")

	outFile := filepath.Join(outputPath, fmt.Sprintf("create_%s.sh", safeName))
	if err := os.WriteFile(outFile, []byte(sb.String()), 0o755); err != nil {
		return "", err
	}
	return outFile, nil
}

// sanitizeSh strips characters that are unsafe even inside single-quoted shell strings.
// Single quotes cannot appear inside single-quoted strings, so we remove them.
func sanitizeSh(s string) string {
	replacer := strings.NewReplacer("'", "", "\n", "", "\r", "")
	return replacer.Replace(s)
}

func writeShLines(sb *strings.Builder, nodes []Node, parentPath string) {
	for _, node := range nodes {
		// SAFETY: generated scripts create folders only, never files.
		if node.IsFile {
			continue
		}
		safe := sanitizeSh(node.Name)
		path := parentPath + "/" + safe
		sb.WriteString(fmt.Sprintf("mkdir -p '%s'\n", path))
		if len(node.Children) > 0 {
			writeShLines(sb, node.Children, path)
		}
	}
}
