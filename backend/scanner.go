package backend

import (
	"os"
	"path/filepath"
)

const maxScanItems = 5000

// ScanFolder reads an existing directory structure and returns it as a Node tree.
func ScanFolder(root string, includeHidden bool, maxDepth int) ([]Node, error) {
	if maxDepth <= 0 {
		maxDepth = 30
	}
	counter := 0
	nodes, err := scanDir(root, 0, maxDepth, includeHidden, &counter)
	return nodes, err
}

func scanDir(path string, depth, maxDepth int, includeHidden bool, counter *int) ([]Node, error) {
	if depth >= maxDepth || *counter >= maxScanItems {
		return nil, nil
	}

	entries, err := os.ReadDir(path)
	if err != nil {
		return nil, err
	}

	var nodes []Node
	for _, e := range entries {
		name := e.Name()
		full := filepath.Join(path, name)
		if !includeHidden && isHidden(full, name) {
			continue
		}
		if *counter >= maxScanItems {
			break
		}
		*counter++

		if !e.IsDir() {
			nodes = append(nodes, Node{Name: name, IsFile: true})
			continue
		}

		children, _ := scanDir(full, depth+1, maxDepth, includeHidden, counter)
		nodes = append(nodes, Node{Name: name, Children: children})
	}
	return nodes, nil
}
