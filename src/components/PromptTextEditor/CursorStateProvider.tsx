import { useEventListener } from "usehooks-ts";
import { Document, Paragraph, useDocument } from "./DocumentProvider";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useHotkeys } from "react-hotkeys-hook";

export interface WordPosition {
  paragraph: number;
  sentence: number;
  word: number;
}

export interface SentencePosition {
  paragraph: number;
  sentence: number;
}

export interface ParagraphPosition {
  paragraph: number;
}

export type BlockPosition = WordPosition | SentencePosition | ParagraphPosition;

export enum SelectionLevel {
  PARAGRAPH,
  SENTENCE,
  WORD,
}

export type SelectionRange = {
  from: BlockPosition;
  to: BlockPosition | null;
};

const WORD_ZERO: BlockPosition = {
  paragraph: 0,
  sentence: 0,
  word: 0,
};

const SENTENCE_ZERO: SentencePosition = {
  paragraph: 0,
  sentence: 0,
};

const CursorStateContext = createContext({
  // position
  position: WORD_ZERO as BlockPosition,
  setPosition: (position: BlockPosition) => {
    position;
  },

  // selection
  isSelecting: false,
  stopSelecting: () => {},

  // selection level
  selectionLevel: SelectionLevel.PARAGRAPH,
  setSelectionLevel: (level: SelectionLevel) => {},

  // selection range
  selectionRange: {
    from: WORD_ZERO,
    to: WORD_ZERO,
  } as SelectionRange | null,
  selectFrom: (position: BlockPosition) => {},
  selectTo: (position: BlockPosition) => {},
  clearSelection: () => {},
  setSelectionRange: (range: SelectionRange | null) => {},
});

type Props = {
  children: React.ReactNode;
};

export const useCursorState = () => useContext(CursorStateContext);
export function distToParagraph(
  pos1: ParagraphPosition,
  pos2: ParagraphPosition
) {
  const paragraphDistance = pos1.paragraph - pos2.paragraph;
  return {
    paragraph: paragraphDistance,
  };
}

enum Precision {
  WORD = 2,
  SENTENCE = 1,
  PARAGRAPH = 0,
}
export function getPrecision(pos: BlockPosition) {
  const hasSentence = (pos as SentencePosition).sentence !== undefined;
  const hasWord = (pos as WordPosition).word !== undefined;

  if (hasWord) {
    return Precision.WORD;
  }
  if (hasSentence) {
    return Precision.SENTENCE;
  }
  return Precision.PARAGRAPH;
}

export function matchPrecision(posArr: BlockPosition[]) {
  let highestPrecision = Precision.WORD;
  for (let i = 0; i < posArr.length; i++) {
    highestPrecision = Math.min(highestPrecision, getPrecision(posArr[i]));
  }

  const result = [] as BlockPosition[];
  for (let i = 0; i < posArr.length; i++) {
    result.push({
      paragraph: posArr[i].paragraph,
      sentence:
        highestPrecision >= Precision.SENTENCE
          ? (posArr[i] as SentencePosition).sentence
          : undefined,
      word:
        highestPrecision >= Precision.WORD
          ? (posArr[i] as WordPosition).word
          : undefined,
    });
  }
  return {
    precision: highestPrecision,
    result,
  };
}

export function getSentencePositionAbs(doc: Document, pos: SentencePosition) {
  let sentencesBefore = 0;
  // count the prev paragraph sentences
  for (let i = 0; i < pos.paragraph; i++) {
    const paragraph = doc[i];
    sentencesBefore += paragraph.length;
  }
  // add sentences in this paragraph
  sentencesBefore += pos.sentence;
  return sentencesBefore;
}

export function getWordPositionAbs(doc: Document, pos: WordPosition) {
  let wordsBefore = 0;
  // count the prev paragraph sentences
  for (let i = 0; i < pos.paragraph; i++) {
    const paragraph = doc[i];
    for (let j = 0; j < paragraph.length; j++) {
      const sentence = paragraph[j];
      // count words in previous sentences
      wordsBefore += sentence.length;
    }
  }
  // add words in this paragraph
  for (let i = 0; i < pos.sentence; i++) {
    // sentences before this sentence
    const sentence = doc[pos.sentence];
    wordsBefore += sentence.length;
  }
  wordsBefore += pos.word;
  return wordsBefore;
}

interface PrecisionDependentHandler<T> {
  paragraph: (pos: ParagraphPosition[]) => T;
  sentence: (pos: SentencePosition[]) => T;
  word: (pos: WordPosition[]) => T;
}
export function forPrecision<T>(
  posArr: BlockPosition[],
  handler: PrecisionDependentHandler<T>
): T | undefined {
  const { precision, result } = matchPrecision(posArr);
  switch (precision) {
    case Precision.PARAGRAPH:
      return handler.paragraph(result);
    case Precision.SENTENCE:
      return handler.sentence(result as SentencePosition[]);
    case Precision.PARAGRAPH:
      return handler.word(result as WordPosition[]);
  }
}

export function isEqualPosition(a: BlockPosition, b: BlockPosition) {
  return forPrecision([a, b], {
    paragraph: function ([a, b]) {
      return a.paragraph === b.paragraph;
    },
    sentence: function ([a, b]) {
      return a.paragraph === b.paragraph && a.sentence === b.sentence;
    },
    word: function ([a, b]): unknown {
      return (
        a.paragraph === b.paragraph &&
        a.sentence === b.sentence &&
        a.word === b.word
      );
    },
  });
}

export function isInsideSelectionRange(
  doc: Document,
  target: BlockPosition,
  range: SelectionRange
): boolean | undefined {
  const isWithinParagraph = (
    from: ParagraphPosition,
    to: ParagraphPosition,
    target: ParagraphPosition
  ) => {
    const upperboundParagraph = Math.max(from.paragraph, to.paragraph);
    const lowerboundParagraph = Math.min(from.paragraph, to.paragraph);
    return (
      target.paragraph >= lowerboundParagraph &&
      target.paragraph <= upperboundParagraph
    );
  };

  const isWithinSentence = (
    doc: Document,
    from: SentencePosition,
    to: SentencePosition,
    target: SentencePosition
  ) => {
    // outside the range, exit early
    if (!isWithinParagraph(from, to, target)) {
      return false;
    }
    const fromSentenceAbs = getSentencePositionAbs(doc, from);
    const toSentenceAbs = getSentencePositionAbs(doc, to);
    const targetSentenceAbs = getSentencePositionAbs(doc, target);

    const upperboundSentence = Math.max(fromSentenceAbs, toSentenceAbs);
    const lowerboundSentence = Math.min(fromSentenceAbs, toSentenceAbs);

    return (
      targetSentenceAbs >= lowerboundSentence &&
      targetSentenceAbs <= upperboundSentence
    );
  };

  // check if paragraph within the selection range
  return forPrecision([range.from, range.to || range.from, target], {
    sentence: ([from, to, target]) => {
      if (!isWithinParagraph(from, to, target)) {
        return false;
      }
      return isWithinSentence(doc, from, to, target);
    },
    paragraph: function ([from, to, target]): boolean {
      return isWithinParagraph(from, to, target);
    },
    word: function ([from, to, target]) {
      throw new Error("Function not implemented.");
      return false;
    },
  });
}

function moveSentencePosition(
  doc: Document,
  position: SentencePosition,
  steps: number = 1,
  ignoreEmptyParagraph: boolean = true
): SentencePosition {
  let current = { ...position };

  const direction = Math.sign(steps);
  const absSteps = Math.abs(steps);

  const isEmptyParagraph = (paragraph: Paragraph) =>
    paragraph.length === 1 && paragraph[0][0] === "";

  for (let i = 0; i < absSteps; i++) {
    if (direction > 0) {
      // Moving forward
      if (current.sentence === doc[current.paragraph].length - 1) {
        while (current.paragraph < doc.length - 1) {
          current.paragraph++;
          if (
            !ignoreEmptyParagraph ||
            !isEmptyParagraph(doc[current.paragraph])
          ) {
            current.sentence = 0;
            break;
          }
        }
      } else {
        current.sentence++;
      }

      if (
        current.paragraph === doc.length - 1 &&
        current.sentence === doc[current.paragraph].length - 1
      ) {
        break; // At the end of the document
      }
    } else {
      // Moving backward
      if (current.sentence === 0) {
        while (current.paragraph > 0) {
          current.paragraph--;
          if (
            !ignoreEmptyParagraph ||
            !isEmptyParagraph(doc[current.paragraph])
          ) {
            current.sentence = doc[current.paragraph].length - 1;
            break;
          }
        }
      } else {
        current.sentence--;
      }

      if (current.paragraph === 0 && current.sentence === 0) {
        break; // At the beginning of the document
      }
    }
  }

  return current;
}

function moveSelection(
  doc: Document,
  range: SelectionRange,
  offset: number,
  preserveRange = true,
  ignoreEmptyParagraph: boolean = true
): SelectionRange | undefined {
  return forPrecision([range.from, range.to || range.from], {
    sentence: ([from, to]) => {
      const newFrom = moveSentencePosition(
        doc,
        from,
        offset,
        ignoreEmptyParagraph
      );
      const newTo = moveSentencePosition(doc, to, offset, ignoreEmptyParagraph);

      return {
        from: preserveRange ? newFrom : newTo,
        to: preserveRange ? newTo : newTo,
      } as SelectionRange;
    },
    paragraph: function ([from, to]) {
      throw new Error("Function not implemented.");
    },
    word: function ([from, to]) {
      throw new Error("Function not implemented.");
    },
  });
}
function expandSelection(
  doc: Document,
  range: SelectionRange,
  offset: number
): SelectionRange {
  return forPrecision([range.from, range.to || range.from], {
    sentence: ([from, to]) => {
      return {
        from: from,
        to: moveSentencePosition(doc, to, offset),
      };
    },
    paragraph: ([from, to]) => {
      throw new Error("Paragraph-level expansion not implemented.");
    },
    word: function ([from, to]) {
      throw new Error("Word-level expansion not implemented.");
    },
  }) as SelectionRange;
}

function distanceBetweenSentences(
  doc: Document,
  from: SentencePosition,
  to: SentencePosition
): number {
  let distance = 0;

  // If the positions are in the same paragraph
  if (from.paragraph === to.paragraph) {
    return Math.abs(to.sentence - from.sentence);
  }

  // Count sentences in paragraphs between 'from' and 'to'
  const startParagraph = Math.min(from.paragraph, to.paragraph);
  const endParagraph = Math.max(from.paragraph, to.paragraph);

  for (let p = startParagraph; p <= endParagraph; p++) {
    if (p === from.paragraph) {
      // Count remaining sentences in the 'from' paragraph
      distance += doc[p].length - from.sentence;
    } else if (p === to.paragraph) {
      // Count sentences up to 'to' in the last paragraph
      distance += to.sentence;
    } else {
      // Count all sentences in intermediate paragraphs
      distance += doc[p].length;
    }
  }

  return distance;
}
function getNextParagraphLastSentence(
  doc: Document,
  pos: SentencePosition,
  ignoreEmptyParagraph: boolean = true
) {
  if (pos.sentence !== doc[pos.paragraph].length - 1) {
    return {
      paragraph: pos.paragraph,
      sentence: doc[pos.paragraph].length - 1,
    };
  }

  if (pos.paragraph >= doc.length - 1) {
    return null;
  }

  const nextParagraph = doc[pos.paragraph + 1];
  const isNextParagraphEmpty =
    nextParagraph.length === 1 && nextParagraph[0][0] === "";

  if (ignoreEmptyParagraph && isNextParagraphEmpty) {
    if (pos.paragraph < doc.length - 2) {
      return getNextParagraphLastSentence(
        doc,
        {
          paragraph: pos.paragraph + 1,
          sentence: 0,
        },
        ignoreEmptyParagraph
      );
    }
    return null;
  }

  return {
    paragraph: pos.paragraph + 1,
    sentence: nextParagraph.length - 1,
  };
}

function getPrevParagraphFirstSentence(
  doc: Document,
  pos: SentencePosition,
  ignoreEmptyParagraph: boolean = true
) {
  if (pos.sentence !== 0) {
    return {
      paragraph: pos.paragraph,
      sentence: 0,
    };
  }

  if (pos.paragraph === 0) {
    return null;
  }

  const prevParagraph = doc[pos.paragraph - 1];
  const isPrevParagraphEmpty =
    prevParagraph.length === 1 && prevParagraph[0][0] === "";
  if (ignoreEmptyParagraph && isPrevParagraphEmpty) {
    return getPrevParagraphFirstSentence(
      doc,
      {
        paragraph: pos.paragraph - 1,
        sentence: 0,
      },
      ignoreEmptyParagraph
    );
  }

  return {
    paragraph: pos.paragraph - 1,
    sentence: 0,
  };
}

export function CursorStateProvider({ children }: Props) {
  const [position, setPosition] = useState<BlockPosition>(WORD_ZERO);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionRange, setSelectionRange] = useState<SelectionRange | null>(
    null
  );
  const [selectionLevel, setSelectionLevel] = useState(
    SelectionLevel.PARAGRAPH
  );
  const { document } = useDocument();

  const [hasSelectionRangeChanged, setHasSelectionRangeChanged] =
    useState(false);

  useEffect(() => {
    setHasSelectionRangeChanged(true);
  }, [selectionRange]);

  const clearSelection = () => {
    setSelectionRange(null);
  };

  const selectFrom = useCallback((position: BlockPosition) => {
    setIsSelecting(true);
    setSelectionRange({
      from: position,
      to: null,
    });
  }, []);

  const selectTo = useCallback((untilPosition: BlockPosition) => {
    setSelectionRange((prev) => {
      return {
        from: prev?.from || WORD_ZERO,
        to: untilPosition,
      };
    });
  }, []);
  const stopSelecting = useCallback(() => {
    setIsSelecting(false);
  }, []);

  // ==============================================
  // FEATURE: Selection via mouse
  // ==============================================
  useEffect(() => {
    const handleMouseUp = () => {
      setIsSelecting(false);
    };
    const handleMouseDown = () => {
      setHasSelectionRangeChanged(false);
    };

    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("mousedown", handleMouseDown, { capture: true });
    return () => {
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("mousedown", handleMouseDown);
    };
  }, []);

  // ==============================================
  // FEATURE: selection level
  // ==============================================
  useEventListener("keydown", (e) => {
    if (e.key === "Shift") {
      setSelectionLevel(SelectionLevel.SENTENCE);
    }
  });

  useEventListener("keyup", (e) => {
    if (e.key === "Shift") {
      setSelectionLevel(SelectionLevel.WORD);
    }
  });

  // ==============================================
  // FEATURE: move selection
  // ==============================================
  useHotkeys("ArrowUp", () => {
    setSelectionRange((prev) => {
      if (prev === null) {
        // enter sentence selection mode when start using arrow keys
        return {
          from: SENTENCE_ZERO,
          to: SENTENCE_ZERO,
        };
      }
      return moveSelection(document, prev, -1, false) || prev;
    });
  });

  useHotkeys("ArrowDown", () => {
    setSelectionRange((prev) => {
      if (prev === null) {
        // enter sentence selection mode when start using arrow keys
        return {
          from: SENTENCE_ZERO,
          to: SENTENCE_ZERO,
        };
      }
      return moveSelection(document, prev, 1, false) || prev;
    });
  });
  // ==============================================
  // FEATURE: move selection preserving range
  // ==============================================
  useHotkeys("meta+shift+ArrowDown", () => {
    setSelectionRange((prev) => {
      if (prev === null) return prev;
      return moveSelection(document, prev, 1, true) || prev;
    });
  });

  useHotkeys("meta+shift+ArrowUp", () => {
    setSelectionRange((prev) => {
      if (prev === null) return prev;
      return moveSelection(document, prev, -1, true) || prev;
    });
  });

  // ==============================================
  // FEATURE: expand selection
  // ==============================================
  useHotkeys("shift+ArrowUp", () => {
    setSelectionRange((prev) => {
      if (prev === null) return prev;
      return expandSelection(document, prev, -1) || prev;
    });
  });
  useHotkeys("shift+ArrowDown", () => {
    setSelectionRange((prev) => {
      if (prev === null) return prev;
      return expandSelection(document, prev, 1) || prev;
    });
  });

  // ==============================================
  // FEATURE: option + arrow keys to go to next/prev paragraph
  // ==============================================
  useHotkeys("alt+ArrowDown", () => {
    setSelectionRange((prev) => {
      if (prev === null) return prev;
      const nextParagraphLastSentence = getNextParagraphLastSentence(
        document,
        prev.from as SentencePosition
      );
      if (nextParagraphLastSentence === null) return prev;
      return {
        from: nextParagraphLastSentence,
        to: nextParagraphLastSentence,
      };
    });
  });
  useHotkeys("alt+ArrowUp", () => {
    setSelectionRange((prev) => {
      if (prev === null) return prev;
      const prevParagraphFirstSentence = getPrevParagraphFirstSentence(
        document,
        prev.from as SentencePosition
      );
      if (prevParagraphFirstSentence === null) return prev;
      return {
        from: prevParagraphFirstSentence,
        to: prevParagraphFirstSentence,
      };
    });
  });

  // ==============================================
  // FEATURE: option + shift + arrow keys to expand selection to next/prev paragraph
  // ==============================================
  useHotkeys("alt+shift+ArrowUp", () => {
    setSelectionRange((prev) => {
      if (prev === null) return prev;
      const prevParagraphFirstSentence = getPrevParagraphFirstSentence(
        document,
        (prev.to as SentencePosition) || (prev.from as SentencePosition)
      );
      return {
        from: prev.from,
        to: prevParagraphFirstSentence,
      };
    });
  });

  useHotkeys("alt+shift+ArrowDown", () => {
    setSelectionRange((prev) => {
      if (prev === null) return prev;
      const nextParagraphLastSentence = getNextParagraphLastSentence(
        document,
        (prev.to as SentencePosition) || (prev.from as SentencePosition)
      );
      return {
        from: prev.from,
        to: nextParagraphLastSentence,
      };
    });
  });

  // ==============================================
  // FEATURE: press escape to cancel selection
  // ==============================================
  useHotkeys("esc", () => {
    setSelectionRange(null);
    stopSelecting();
  });

  // selection range changed
  useEventListener("click", () => {
    if (hasSelectionRangeChanged) return;
    clearSelection();
  });

  return (
    <CursorStateContext.Provider
      value={{
        setPosition,
        position,
        stopSelecting,
        isSelecting,
        setSelectionRange,
        selectFrom,
        clearSelection,
        selectTo,
        selectionRange,
        setSelectionLevel,
        selectionLevel,
      }}
    >
      {children}
    </CursorStateContext.Provider>
  );
}
