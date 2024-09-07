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
import { ParagraphBlock } from "./blocks/ParagraphBlock";

export interface CharacterPosition {
  paragraph: number;
  sentence: number;
  word: number;
  character: number;
}

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

export type BlockPosition =
  | CharacterPosition
  | WordPosition
  | SentencePosition
  | ParagraphPosition;

export type SelectionRange = {
  from: BlockPosition;
  to: BlockPosition | null;
};

export enum Precision {
  CHARACTER = 3,
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

export function getPrecisionName(precision: Precision) {
  switch (precision) {
    case Precision.SENTENCE:
      return "sentence";
    case Precision.PARAGRAPH:
      return "paragraph";
    case Precision.CHARACTER:
      return "character";
    case Precision.WORD:
      return "word";
  }
}

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
  selectionLevel: Precision.PARAGRAPH,
  setSelectionLevel: (level: Precision) => {},

  // selection range
  selectionRange: {
    from: WORD_ZERO,
    to: WORD_ZERO,
  } as SelectionRange | null,
  selectFrom: (position: BlockPosition) => {},
  selectTo: (position: BlockPosition) => {},
  clearSelection: () => {},
  setSelectionRange: (range: SelectionRange | null) => {},

  // input mode
  inputMode: "mouse" as "mouse" | "keyboard",
});

type Props = {
  children: React.ReactNode;
};

export const useCursorState = () => useContext(CursorStateContext);
export function distToParagraph(
  pos1: ParagraphPosition,
  pos2: ParagraphPosition,
) {
  const paragraphDistance = pos1.paragraph - pos2.paragraph;
  return {
    paragraph: paragraphDistance,
  };
}

export function createPosition(position: BlockPosition, precision?: Precision) {
  precision = precision || getPrecision(position);

  const paragraph = position.paragraph;
  const sentence = (position as SentencePosition).sentence || 0;
  const word = (position as WordPosition).word;
  const character = (position as CharacterPosition).character;

  switch (precision) {
    case Precision.CHARACTER:
      return {
        character,
        paragraph,
        sentence,
        word,
      };
    case Precision.WORD:
      return {
        paragraph,
        sentence,
        word,
      };
    case Precision.SENTENCE:
      return {
        paragraph,
        sentence,
      };
    case Precision.PARAGRAPH:
      return {
        paragraph,
      };
  }
}
export function createSelection(
  from: BlockPosition | null,
  to?: BlockPosition,
  precision?: Precision,
): SelectionRange {
  if (!from) {
    return {
      from: WORD_ZERO,
      to: null,
    };
  }
  return {
    from: createPosition(from, precision),
    to: (to && createPosition(to, precision)) || null,
  };
}

/**
 *  Purpose of this is to decide between position or range
 */
export function rangeToPosition(range: SelectionRange) {
  return range.to || range.from;
}

function isWordPosition(from: BlockPosition): from is WordPosition {
  if (
    from.paragraph !== undefined &&
    (from as SentencePosition).sentence !== undefined &&
    (from as WordPosition).word !== undefined
  ) {
    return true;
  }
  return false;
}
function isSentencePosition(from: BlockPosition): from is SentencePosition {
  return (
    from.paragraph !== undefined &&
    (from as SentencePosition).sentence !== undefined &&
    (from as WordPosition).word === undefined
  );
}
export function convertToWordPosition(
  doc: Document,
  from: BlockPosition,
  roundingDirection: "start" | "end" = "start",
): WordPosition {
  const sentence = (from as SentencePosition).sentence || 0;

  const word =
    (from as WordPosition).word || roundingDirection === "start"
      ? 0
      : doc[from.paragraph][sentence].length - 1;
  return {
    paragraph: from.paragraph,
    sentence: sentence,
    word: word,
  };
}
export function convertToSentencePosition(
  doc: Document,
  from: BlockPosition,
  roundingDirection: "start" | "end" = "start",
): SentencePosition {
  return {
    paragraph: from.paragraph,
    sentence:
      (from as SentencePosition).sentence || roundingDirection === "start"
        ? 0
        : doc[from.paragraph].length - 1,
  };
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
    const sentence = doc[pos.paragraph][i];
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
  handler: PrecisionDependentHandler<T>,
): T | undefined {
  const { precision, result } = matchPrecision(posArr);
  switch (precision) {
    case Precision.PARAGRAPH:
      return handler.paragraph(result);
    case Precision.SENTENCE:
      return handler.sentence(result as SentencePosition[]);
    case Precision.WORD:
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
  range: SelectionRange,
): boolean | undefined {
  const isWithinParagraph = (
    from: ParagraphPosition,
    to: ParagraphPosition,
    target: ParagraphPosition,
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
    target: SentencePosition,
    inclusive: boolean = true,
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

    if (inclusive) {
      return (
        targetSentenceAbs >= lowerboundSentence &&
        targetSentenceAbs <= upperboundSentence
      );
    }
    return (
      targetSentenceAbs > lowerboundSentence &&
      targetSentenceAbs < upperboundSentence
    );
  };

  const isWithinWord = (
    doc: Document,
    from: WordPosition,
    to: WordPosition,
    target: WordPosition,
  ) => {
    const fromWordAbs = getWordPositionAbs(doc, from);
    const toWordAbs = getWordPositionAbs(doc, to);
    const targetWordAbs = getWordPositionAbs(doc, target);
    // console.log(fromWordAbs, toWordAbs, targetWordAbs);

    const upperboundWord = Math.max(fromWordAbs, toWordAbs);
    const lowerboundWord = Math.min(fromWordAbs, toWordAbs);

    return targetWordAbs >= lowerboundWord && targetWordAbs <= upperboundWord;
  };

  // check if paragraph within the selection range
  return forPrecision([range.from, range.to || range.from, target], {
    word: function ([from, to, target]) {
      if (!isWithinParagraph(from, to, target)) {
        return false;
      }
      return isWithinWord(doc, from, to, target);
    },
    sentence: ([from, to, target]) => {
      if (!isWithinParagraph(from, to, target)) {
        return false;
      }
      return isWithinSentence(doc, from, to, target);
    },
    paragraph: function ([from, to, target]): boolean {
      return isWithinParagraph(from, to, target);
    },
  });
}

function moveSentencePosition(
  doc: Document,
  position: SentencePosition,
  steps: number = 1,
  ignoreEmptyParagraph: boolean = true,
): SentencePosition {
  const current = {
    paragraph: position.paragraph,
    sentence: position.sentence,
  };

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

function moveWordPosition(
  doc: Document,
  position: WordPosition,
  steps: number = 1,
  ignoreEmptyParagraph: boolean = true,
): WordPosition {
  const current = { ...position };

  const direction = Math.sign(steps);
  const absSteps = Math.abs(steps);

  const isEmptyParagraph = (paragraph: Paragraph) =>
    paragraph.length === 1 && paragraph[0].length === 0;

  for (let i = 0; i < absSteps; i++) {
    if (direction > 0) {
      // Moving forward
      if (
        current.word ===
        doc[current.paragraph][current.sentence].length - 1
      ) {
        // Move to next sentence
        if (current.sentence === doc[current.paragraph].length - 1) {
          // Move to next paragraph
          while (current.paragraph < doc.length - 1) {
            current.paragraph++;
            if (
              !ignoreEmptyParagraph ||
              !isEmptyParagraph(doc[current.paragraph])
            ) {
              current.sentence = 0;
              current.word = 0;
              break;
            }
          }
        } else {
          current.sentence++;
          current.word = 0;
        }
      } else {
        current.word++;
      }

      if (
        current.paragraph === doc.length - 1 &&
        current.sentence === doc[current.paragraph].length - 1 &&
        current.word === doc[current.paragraph][current.sentence].length - 1
      ) {
        break; // At the end of the document
      }
    } else {
      // Moving backward
      if (current.word === 0) {
        // Move to previous sentence
        if (current.sentence === 0) {
          // Move to previous paragraph
          while (current.paragraph > 0) {
            current.paragraph--;
            if (
              !ignoreEmptyParagraph ||
              !isEmptyParagraph(doc[current.paragraph])
            ) {
              current.sentence = doc[current.paragraph].length - 1;
              current.word =
                doc[current.paragraph][current.sentence].length - 1;
              break;
            }
          }
        } else {
          current.sentence--;
          current.word = doc[current.paragraph][current.sentence].length - 1;
        }
      } else {
        current.word--;
      }

      if (
        current.paragraph === 0 &&
        current.sentence === 0 &&
        current.word === 0
      ) {
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
  ignoreEmptyParagraph: boolean = true,
): SelectionRange | undefined {
  return forPrecision([range.from, range.to || range.from], {
    sentence: ([from, to]) => {
      const newFrom = moveSentencePosition(
        doc,
        from,
        offset,
        ignoreEmptyParagraph,
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
      const newFrom = moveWordPosition(doc, from, offset, ignoreEmptyParagraph);
      const newTo = moveWordPosition(doc, to, offset, ignoreEmptyParagraph);

      return {
        from: preserveRange ? newFrom : newTo,
        to: preserveRange ? newTo : newTo,
      } as SelectionRange;
    },
  });
}

function moveSelectionBySentence(
  doc: Document,
  range: SelectionRange,
  offset: number,
  preserveRange: boolean = true,
  ignoreEmptyParagraph: boolean = true,
): SelectionRange {
  // if it were word position, strip the word position and
  // turn it into sentence position
  if (isWordPosition(range.from)) {
    const sentencePosition = {
      paragraph: range.from.paragraph,
      sentence: range.from.sentence,
    };
    return {
      from: sentencePosition,
      to: sentencePosition,
    };
  }

  const newFrom = moveSentencePosition(
    doc,
    range.from as SentencePosition,
    offset,
    ignoreEmptyParagraph,
  );
  const newTo = moveSentencePosition(
    doc,
    (range.to || range.from) as SentencePosition,
    offset,
    ignoreEmptyParagraph,
  );

  return {
    from: preserveRange ? newFrom : newTo,
    to: preserveRange ? newTo : newTo,
  } as SelectionRange;
}

function expandSelection(
  doc: Document,
  range: SelectionRange,
  offset: number,
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

export function getParagraphlastSentence(paragraph: Paragraph) {
  return paragraph[paragraph.length - 1];
}

function getNextParagraphLastSentence(
  doc: Document,
  pos: SentencePosition,
  ignoreEmptyParagraph: boolean = true,
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
        ignoreEmptyParagraph,
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
  ignoreEmptyParagraph: boolean = true,
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
      ignoreEmptyParagraph,
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
    null,
  );

  const [inputMode, setInputMode] = useState<"keyboard" | "mouse">("mouse");

  const [selectionLevel, setSelectionLevel] = useState(Precision.SENTENCE);
  const { document, insertWord, updateWord, deleteWord, getWord } =
    useDocument();

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

  // =============================================
  // Toggle between keyboard and mouse mode
  // =============================================
  useEventListener(
    "keydown",
    (e) => {
      if (e.ctrlKey) return;
      if (e.altKey) return;
      if (e.metaKey) return;
      if (e.shiftKey) return;
      setInputMode("keyboard");
    },
    undefined,
    { capture: false },
  );
  useEventListener(
    "mousedown",
    () => {
      setInputMode("mouse");
    },
    undefined,
    { capture: false },
  );

  // ==============================================
  // FEATURE: selection level
  // ==============================================
  useEventListener("keydown", (e) => {
    if (e.key === "Shift") {
      setSelectionLevel(Precision.SENTENCE);
    }
  });

  useEventListener("keyup", (e) => {
    if (e.key === "Shift") {
      setSelectionLevel(Precision.WORD);
    }
  });

  useEventListener("keydown", (e) => {});

  // ==============================================
  // FEATURE: move selection
  // ==============================================
  useHotkeys("ArrowUp", () => {
    setSelectionRange((prev) => {
      if (prev === null) {
        // enter sentence selection mode when start using arrow keys
        return {
          from: convertToSentencePosition(document, position),
          to: convertToSentencePosition(document, position),
        };
      }
      setSelectionLevel(Precision.SENTENCE);
      return moveSelectionBySentence(document, prev, -1, false) || prev;
    });
  });

  useHotkeys("ArrowDown", () => {
    setSelectionRange((prev) => {
      if (prev === null) {
        // enter sentence selection mode when start using arrow keys
        return {
          from: convertToSentencePosition(document, position),
          to: convertToSentencePosition(document, position),
        };
      }
      setSelectionLevel(Precision.SENTENCE);
      return moveSelectionBySentence(document, prev, 1, false) || prev;
    });
  });

  useHotkeys("ArrowLeft", () => {
    setSelectionLevel(Precision.WORD);
    setSelectionRange((prev) => {
      if (prev === null) {
        return { from: position, to: position };
      }
      const prevPosition = prev.to || prev.from;
      if (isSentencePosition(prevPosition)) {
        return {
          from: convertToWordPosition(document, prevPosition, "start"),
        } as SelectionRange;
      }
      return moveSelection(document, prev, -1, true) || prev;
    });
  });

  useHotkeys("ArrowRight", () => {
    setSelectionLevel(Precision.WORD);
    setSelectionRange((prev) => {
      if (prev === null) {
        return { from: position, to: position };
      }
      const prevPosition = prev.to || prev.from;
      if (isSentencePosition(prevPosition)) {
        return {
          from: convertToWordPosition(document, prevPosition, "end"),
        } as SelectionRange;
      }
      return moveSelection(document, prev, 1, true) || prev;
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
        prev.from as SentencePosition,
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
        prev.from as SentencePosition,
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
        (prev.to as SentencePosition) || (prev.from as SentencePosition),
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
        (prev.to as SentencePosition) || (prev.from as SentencePosition),
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
    setPosition(
      convertToWordPosition(
        document,
        selectionRange?.to || selectionRange?.from || WORD_ZERO,
      ),
    );
    stopSelecting();
    setSelectionLevel(Precision.WORD);
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
        inputMode,
      }}
    >
      {children}
    </CursorStateContext.Provider>
  );
}
