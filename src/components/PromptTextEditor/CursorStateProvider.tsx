import { useEventListener } from "usehooks-ts";
import { Document } from "./DocumentProvider";
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

const CURSOR_POSITION_ZERO: BlockPosition = {
  paragraph: 0,
  sentence: 0,
  word: 0,
};

const CursorStateContext = createContext({
  // position
  position: CURSOR_POSITION_ZERO as BlockPosition,
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
    from: CURSOR_POSITION_ZERO,
    to: CURSOR_POSITION_ZERO,
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

// TODO: implement move selection using arrow keys
function moveSelection(doc: Document, range: SelectionRange, offset: number) {
  return forPrecision([range.from, range.to || range.from], {
    sentence: ([from, to]) => {},
    paragraph: function ([from, to]): boolean {
      throw new Error("Function not implemented.");
    },
    word: function ([from, to]) {
      throw new Error("Function not implemented.");
    },
  });
}

export function CursorStateProvider({ children }: Props) {
  const [position, setPosition] = useState<BlockPosition>(CURSOR_POSITION_ZERO);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionRange, setSelectionRange] = useState<SelectionRange | null>(
    null
  );
  const [selectionLevel, setSelectionLevel] = useState(
    SelectionLevel.PARAGRAPH
  );
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
        from: prev?.from || CURSOR_POSITION_ZERO,
        to: untilPosition,
      };
    });
  }, []);
  const stopSelecting = useCallback(() => {
    setIsSelecting(false);
  }, []);

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

  useEventListener("keydown", (e) => {
    if (e.key === "Down") {
    }
  });

  // press escape to cancel selection
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
