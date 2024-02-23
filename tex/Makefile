
BUILD_DIR := $(CURDIR)/build

PDFLATEX := TEXINPUTS=$(CURDIR): \
	pdflatex -interaction=nonstopmode -halt-on-error -shell-escape -output-directory ${BUILD_DIR}

JUNK := *.pdf *.aux *.log *.bbl *.blg *.toc *.out *.fdb_latexmk *.fls *.synctex.gz

.PHONY: all ff patch clean

all: clean ff

ff: patch
	mkdir -p ${BUILD_DIR}
	${PDFLATEX} ff
	${PDFLATEX} ff

clean:
	rm -rf build
