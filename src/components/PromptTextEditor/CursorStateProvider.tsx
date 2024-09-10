import { useEventListener } from "usehooks-ts";
import {
  convertDocumentToString,
  Document,
  Paragraph,
  useDocument,
} from "./DocumentProvider";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { useWordPositionInfoRegistry } from "./WordPositionInfoProvder";
import { useEditorMode } from "./EditorModeContext";

// include all punctuations
const PUNTUATION_REGEX = /[\s;:.,"]/;

// only peroid
// const PUNTUATION_REGEX = /[\s.]/;

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
  const word = (position as WordPosition).word || 0;
  const character = (position as CharacterPosition).character || 0;

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
  to?: BlockPosition | null,
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
  return range.to || clonePosition(range.from);
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
  // make sure the it is word position
  if ((from as WordPosition).word) return from as WordPosition;

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

    const upperboundWord = Math.max(fromWordAbs, toWordAbs);
    const lowerboundWord = Math.min(fromWordAbs, toWordAbs);

    return targetWordAbs >= lowerboundWord && targetWordAbs <= upperboundWord;
  };

  // check if paragraph within the selection range
  return forPrecision(
    [range.from, range.to || clonePosition(range.from), target],
    {
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
    },
  );
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
  return forPrecision([range.from, range.to || clonePosition(range.from)], {
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
      let newFrom = from;
      let newTo = to;
      for (let i = 0; i < Math.abs(offset); i++) {
        newFrom =
          offset > 0
            ? getNextWordPosition(doc, newFrom, false) || newFrom
            : getPreviousWordPosition(doc, newFrom, false) || newFrom;
        newTo =
          offset > 0
            ? getNextWordPosition(doc, newTo, false) || newTo
            : getPreviousWordPosition(doc, newTo, false) || newTo;
      }

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
    (range.to || clonePosition(range.from)) as SentencePosition,
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
  return forPrecision([range.from, range.to || clonePosition(range.from)], {
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
      let newTo = to;
      for (let i = 0; i < Math.abs(offset); i++) {
        newTo =
          offset > 0
            ? getNextWordPosition(doc, newTo, false) || newTo
            : getPreviousWordPosition(doc, newTo, false) || newTo;
      }

      return {
        from: from,
        to: newTo,
      };
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

function getPrevSentencePosition(
  document: Document,
  pos: WordPosition,
  ignoreEmpty: boolean = true,
): SentencePosition | null {
  if (pos.paragraph === 0 && pos.sentence === 0) {
    return null;
  }

  if (pos.paragraph === 0 && pos.sentence > 0) {
    return {
      paragraph: 0,
      sentence: pos.sentence - 1,
    };
  }

  const isFirstSentence = pos.sentence === 0;
  const prevSentencePos = {
    paragraph: isFirstSentence ? pos.paragraph - 1 : pos.paragraph,
    sentence: isFirstSentence
      ? document[pos.paragraph - 1].length - 1
      : pos.sentence - 1,
  };

  // check if prev sentence empty
  const prevSentence =
    document[prevSentencePos.paragraph][prevSentencePos.sentence];
  if (ignoreEmpty && !prevSentence[0]) {
    return getPrevSentencePosition(document, {
      paragraph: prevSentencePos.paragraph,
      sentence: prevSentencePos.sentence,
      word: 0,
    });
  }

  return prevSentencePos;
}

function isLastWordInSentence(document: Document, pos: WordPosition) {
  return pos.word === document[pos.paragraph][pos.sentence].length - 1;
}

function getPrevPunctuationPosition(document: Document, pos: WordPosition) {
  return findPreviousWordPositionRecurssively(
    document,
    pos,
    (current, wordBefore) => {
      // the very first word
      if (
        current.position.word === 0 &&
        current.position.sentence === 0 &&
        current.position.paragraph === 0
      ) {
        return true;
      }

      if (current.position.word === 0 && current.position.sentence === 0) {
        return true;
      }

      const isPunctuation = PUNTUATION_REGEX.test(wordBefore?.word || "");

      if (isPunctuation) {
        return true;
      }
      return false;
    },
  ) as WordPosition;
}

export function findPreviousWordPositionRecurssively(
  document: Document,
  pos: WordPosition,
  searchFunction: (
    current: { word: string; position: WordPosition },
    wordBefore: { word: string; position: WordPosition } | null,
  ) => boolean,
) {
  const prevWord = getPreviousWordPosition(document, pos, true);
  if (prevWord === null) return null;
  const prevWordStr = document[prevWord.paragraph][prevWord.sentence][
    prevWord.word
  ] as string;

  const wordBefore = getPreviousWordPosition(document, prevWord, true);
  const wordBeforeStr =
    wordBefore &&
    document[wordBefore.paragraph][wordBefore.sentence][wordBefore.word];

  if (
    searchFunction(
      { word: prevWordStr, position: prevWord },
      wordBefore
        ? { word: wordBeforeStr as string, position: wordBefore }
        : null,
    )
  ) {
    return prevWord;
  }

  return findPreviousWordPositionRecurssively(
    document,
    prevWord,
    searchFunction,
  );
}

export function getPrevParagraphPosition(
  document: Document,
  pos: WordPosition,
  precision?: Precision,
): WordPosition | SentencePosition | ParagraphPosition | null {
  if (pos.paragraph === 0) return null;
  precision = precision || getPrecision(pos);

  switch (precision) {
    case Precision.WORD:
      return {
        paragraph: pos.paragraph - 1,
        sentence: document[pos.paragraph - 1].length - 1,
        word:
          document[pos.paragraph - 1][document[pos.paragraph - 1].length - 1]
            .length - 1,
      } as WordPosition;
    case Precision.SENTENCE:
      return {
        paragraph: pos.paragraph - 1,
        sentence: document[pos.paragraph - 1].length - 1,
      } as SentencePosition;
    case Precision.PARAGRAPH:
      return {
        paragraph: pos.paragraph - 1,
      } as ParagraphPosition;
  }
  return null;
}

export function getPreviousWordPosition(
  document: Document,
  pos: WordPosition,
  ignoreEmpty = true,
): WordPosition | null {
  const currSentence = document[pos.paragraph][pos.sentence];
  if (pos.word === 0 && pos.sentence === 0 && pos.paragraph === 0) {
    return null;
  }

  // if word is first word of paragraph, jump to previous paragraph
  if (pos.word === 0 && pos.sentence === 0) {
    const prevParagraphPos = getPrevParagraphPosition(document, pos);
    if (prevParagraphPos === null) {
      return null;
    }

    // check if prev paragraph is empty
    const prevParagraph = document[prevParagraphPos.paragraph];
    if (prevParagraph.length === 1 && !prevParagraph[0][0]) {
      return getPreviousWordPosition(document, {
        paragraph: prevParagraphPos.paragraph,
        sentence: 0,
        word: 0,
      });
    }

    return {
      paragraph: prevParagraphPos.paragraph,
      sentence: document[prevParagraphPos.paragraph].length - 1,
      word:
        document[prevParagraphPos.paragraph][
          document[prevParagraphPos.paragraph].length - 1
        ].length - 1,
    } as WordPosition;
  }

  // if prev word is first word of sentence, jump to previous sentence
  if (pos.word === 0) {
    const prevSentence = getPrevSentencePosition(document, pos);
    if (prevSentence === null) {
      return null;
    }

    return {
      paragraph: prevSentence.paragraph,
      sentence: prevSentence.sentence,
      word: document[prevSentence.paragraph][prevSentence.sentence].length - 1,
    };
  }

  const prevWord = currSentence[pos.word - 1];

  if (ignoreEmpty && !prevWord) {
    return getPreviousWordPosition(document, {
      paragraph: pos.paragraph,
      sentence: pos.sentence,
      word: pos.word - 1,
    });
  }

  return {
    paragraph: pos.paragraph,
    sentence: pos.sentence,
    word: pos.word - 1,
  };
}

export function getNextWordPosition(
  document: Document,
  pos: WordPosition,
  ignoreEmpty = true,
): WordPosition | null {
  const currSentence = document[pos.paragraph][pos.sentence];

  if (
    pos.paragraph === document.length - 1 &&
    pos.sentence === document[pos.paragraph].length - 1 &&
    pos.word === currSentence.length - 1
  ) {
    return null;
  }

  // if next word is last word of paragraph, jump to next paragraph
  if (
    pos.word === currSentence.length - 1 &&
    pos.sentence === document[pos.paragraph].length - 1
  ) {
    const nextParagraphPos = getNextParagraphPosition(document, pos);
    if (nextParagraphPos === null) {
      return null;
    }

    // check if next paragraph is empty
    const nextParagraph = document[nextParagraphPos.paragraph];
    if (nextParagraph.length === 1 && !nextParagraph[0][0]) {
      return getNextWordPosition(document, {
        paragraph: nextParagraphPos.paragraph,
        sentence: 0,
        word: 0,
      });
    }

    return {
      paragraph: nextParagraphPos.paragraph,
      sentence: 0,
      word: 0,
    } as WordPosition;
  }

  // if next word is last word of sentence, jump to next sentence
  if (pos.word === currSentence.length - 1) {
    const nextSentence = getNextSentencePosition(document, pos, true);
    if (nextSentence === null) {
      return null;
    }

    return {
      paragraph: nextSentence.paragraph,
      sentence: nextSentence.sentence,
      word: 0,
    };
  }

  const nextWord = currSentence[pos.word + 1];

  if (ignoreEmpty && !nextWord) {
    return getNextWordPosition(document, {
      paragraph: pos.paragraph,
      sentence: pos.sentence,
      word: pos.word + 1,
    });
  }

  return {
    paragraph: pos.paragraph,
    sentence: pos.sentence,
    word: pos.word + 1,
  };
}

function getNextPunctuationPosition(document: Document, pos: WordPosition) {
  return findNextWordPositionRecursively(document, pos, (current) => {
    // the very last word
    if (
      current.position.paragraph === document.length - 1 &&
      current.position.sentence === document[document.length - 1].length - 1 &&
      current.position.word ===
        document[document.length - 1][document[document.length - 1].length - 1]
          .length -
          1
    ) {
      return true;
    }

    const isPunctuation = PUNTUATION_REGEX.test(current.word);
    if (isPunctuation) {
      return true;
    }

    if (isLastWordInSentence(document, current.position)) {
      return true;
    }

    return false;
  }) as WordPosition;
}

function findNextWordPositionRecursively(
  document: Document,
  pos: WordPosition,
  searchFunction: (
    current: { word: string; position: WordPosition },
    wordAfter: { word: string; position: WordPosition } | null,
  ) => boolean,
) {
  const nextWord = getNextWordPosition(document, pos, true);

  if (nextWord === null) return null;
  const nextWordStr = document[nextWord.paragraph][nextWord.sentence][
    nextWord.word
  ] as string;

  const wordAfter = getNextWordPosition(document, nextWord, true);
  const wordAfterStr =
    wordAfter &&
    document[wordAfter.paragraph][wordAfter.sentence][wordAfter.word];

  if (
    searchFunction(
      { word: nextWordStr, position: nextWord },
      wordAfter ? { word: wordAfterStr as string, position: wordAfter } : null,
    )
  ) {
    return nextWord;
  }

  return findNextWordPositionRecursively(document, nextWord, searchFunction);
}

export function getNextParagraphPosition(
  document: Document,
  pos: WordPosition,
  precision?: Precision,
): WordPosition | SentencePosition | ParagraphPosition | null {
  if (pos.paragraph === document.length - 1) return null;
  precision = precision || getPrecision(pos);

  switch (precision) {
    case Precision.WORD:
      return {
        paragraph: pos.paragraph + 1,
        sentence: 0,
        word: 0,
      } as WordPosition;
    case Precision.SENTENCE:
      return {
        paragraph: pos.paragraph + 1,
        sentence: 0,
      } as SentencePosition;
    case Precision.PARAGRAPH:
      return {
        paragraph: pos.paragraph + 1,
      } as ParagraphPosition;
  }
  return null;
}

function getNextSentencePosition(
  document: Document,
  pos: WordPosition,
  ignoreEmpty: boolean = true,
): SentencePosition | null {
  if (
    pos.paragraph === document.length - 1 &&
    pos.sentence === document[pos.paragraph].length - 1
  ) {
    return null;
  }

  const lastSentenceInParagraph = document[pos.paragraph].length - 1;

  const nextSentenceParagraph =
    pos.sentence === lastSentenceInParagraph
      ? pos.paragraph + 1
      : pos.paragraph;

  const nextSentenceInParagraph =
    pos.sentence === lastSentenceInParagraph ? 0 : pos.sentence + 1;

  const nextSentencePos = {
    paragraph: nextSentenceParagraph,
    sentence: nextSentenceInParagraph,
  };

  // check if next sentence is empty
  const nextSentence =
    document[nextSentencePos.paragraph][nextSentencePos.sentence];
  if (ignoreEmpty && !nextSentence[0]) {
    return getNextSentencePosition(document, {
      paragraph: nextSentencePos.paragraph,
      sentence: nextSentencePos.sentence,
      word: 0,
    });
  }

  return nextSentencePos;
}
export function clonePosition(position: BlockPosition) {
  return {
    paragraph: position.paragraph,
    sentence: (position as SentencePosition).sentence,
    word: (position as WordPosition).word,
  };
}

export function getSelectionPrecision({ from, to }: SelectionRange): Precision {
  const fromPrecision = getPrecision(from);
  const toPrecision = getPrecision(to || clonePosition(from));

  // If precision is different, return the lowest precision
  if (
    fromPrecision === Precision.PARAGRAPH ||
    toPrecision === Precision.PARAGRAPH
  ) {
    return Precision.PARAGRAPH; // Return PARAGRAPH if either is PARAGRAPH
  } else if (
    fromPrecision === Precision.SENTENCE ||
    toPrecision === Precision.SENTENCE
  ) {
    return Precision.SENTENCE; // Return SENTENCE if either is SENTENCE
  } else if (
    fromPrecision === Precision.WORD ||
    toPrecision === Precision.WORD
  ) {
    return Precision.WORD; // Return WORD if either is WORD
  } else {
    return Precision.CHARACTER; // Default to CHARACTER if none match
  }
}
export function getSelectionBoundSorted({ from, to }: SelectionRange): {
  lowerBound: WordPosition;
  upperBound: WordPosition;
} {
  const fromPos = from as WordPosition;
  const toPos = (to as WordPosition) || clonePosition(from);

  const lowerBound =
    fromPos.paragraph < toPos.paragraph ||
    (fromPos.paragraph === toPos.paragraph &&
      fromPos.sentence < toPos.sentence) ||
    (fromPos.paragraph === toPos.paragraph &&
      fromPos.sentence === toPos.sentence &&
      fromPos.word < toPos.word)
      ? fromPos
      : toPos;
  const upperBound =
    fromPos.paragraph > toPos.paragraph ||
    (fromPos.paragraph === toPos.paragraph &&
      fromPos.sentence > toPos.sentence) ||
    (fromPos.paragraph === toPos.paragraph &&
      fromPos.sentence === toPos.sentence &&
      fromPos.word > toPos.word)
      ? fromPos
      : toPos;

  return { lowerBound, upperBound };
}

function isSelectingFullSentence(document: Document, range: SelectionRange) {
  if (!range.to || (range.from as WordPosition).word === undefined) {
    return false;
  }
  const { lowerBound, upperBound } = getSelectionBoundSorted(range);

  return (
    lowerBound.word === 0 &&
    upperBound.word ===
      document[upperBound.paragraph][upperBound.sentence].length - 1
  );
}

export function convertSelectionPrecision(
  range: SelectionRange,
  precision: Precision,
) {
  const { from, to } = range;

  // Convert 'from' position to the desired precision
  const newFrom = createPosition(from, precision);

  // Convert 'to' position to the desired precision if it exists
  const newTo = to ? createPosition(to, precision) : null;

  return {
    from: newFrom,
    to: newTo,
  } as SelectionRange;
}
export function CursorStateProvider({ children }: Props) {
  const [position, setPosition] = useState<BlockPosition>(WORD_ZERO);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionRange, setSelectionRange] = useState<SelectionRange | null>(
    null,
  );
  const [inputMode, setInputMode] = useState<"keyboard" | "mouse">("mouse");

  const { getWordAbove, getWordBelow, getWordVisualPositionInfo } =
    useWordPositionInfoRegistry();

  const [selectionLevel, setSelectionLevel] = useState(Precision.WORD);
  const { setEditorMode } = useEditorMode();
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
    setSelectionLevel(getPrecision(position));
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

      if (getSelectionPrecision(prev) === Precision.WORD) {
        if (isSelectingFullSentence(document, prev)) {
          return (
            moveSelectionBySentence(
              document,
              convertSelectionPrecision(prev, Precision.SENTENCE),
              -1,
              false,
            ) || prev
          );
        }
        const currentWordPosition = (prev.to ||
          clonePosition(prev.from)) as WordPosition;
        const visualPosition = getWordVisualPositionInfo(currentWordPosition);
        if (!visualPosition) return prev;

        const nextWordPosition = getWordAbove(visualPosition);
        if (!nextWordPosition) return prev;
        return createSelection(nextWordPosition.position);
      }

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

      if (getSelectionPrecision(prev) === Precision.WORD) {
        if (isSelectingFullSentence(document, prev)) {
          return (
            moveSelectionBySentence(
              document,
              convertSelectionPrecision(prev, Precision.SENTENCE),
              1,
              false,
            ) || prev
          );
        }

        const currentWordPosition = (prev.to ||
          clonePosition(prev.from)) as WordPosition;
        const visualPosition = getWordVisualPositionInfo(currentWordPosition);
        if (!visualPosition) return prev;

        const nextWordPosition = getWordBelow(visualPosition);
        if (!nextWordPosition) return prev;
        return createSelection(nextWordPosition.position);
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
      const prevPosition = prev.to || clonePosition(prev.from);
      if (isSentencePosition(prevPosition)) {
        return {
          from: convertToWordPosition(document, prevPosition, "start"),
        } as SelectionRange;
      }
      return moveSelection(document, prev, -1, false) || prev;
    });
  });

  useHotkeys("ArrowRight", () => {
    setSelectionLevel(Precision.WORD);
    setSelectionRange((prev) => {
      if (prev === null) {
        return { from: position, to: position };
      }
      const prevPosition = prev.to || clonePosition(prev.from);
      if (isSentencePosition(prevPosition)) {
        return {
          from: convertToWordPosition(document, prevPosition, "end"),
        } as SelectionRange;
      }
      return moveSelection(document, prev, 1, false) || prev;
    });
  });

  // ==============================================
  // FEATURE: move between sentences using tab
  // ==============================================
  useHotkeys("shift+tab", (e) => {
    e.preventDefault();
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
  useHotkeys("tab", (e) => {
    e.preventDefault();
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

  // ==============================================
  // FEATURE: jump word between puntuation when option Arrow
  // ==============================================
  useHotkeys("alt+ArrowLeft", () => {
    setSelectionRange((prev) => {
      if (prev === null) return prev;

      const pos = convertToWordPosition(
        document,
        prev.to || clonePosition(prev.from),
        "start",
      );
      const lastPunctuationPos = getPrevPunctuationPosition(document, pos);
      return createSelection(lastPunctuationPos, undefined, Precision.WORD);
    });
  });

  useHotkeys("alt+ArrowRight", () => {
    setSelectionRange((prev) => {
      if (prev === null) return prev;

      const pos = convertToWordPosition(
        document,
        prev.to || clonePosition(prev.from),
        "start",
      );
      const nextPunctuationPos = getNextPunctuationPosition(document, pos);
      return createSelection(nextPunctuationPos, undefined, Precision.WORD);
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

      const newSelection = createSelection(
        prev.from,
        prev.to,
        Precision.SENTENCE,
      );
      if (getPrecision(prev.from) !== Precision.SENTENCE) {
        return newSelection;
      }
      return expandSelection(document, newSelection, -1) || prev;
    });
  });
  useHotkeys("shift+ArrowDown", () => {
    setSelectionRange((prev) => {
      if (prev === null) return prev;
      const newSelection = createSelection(
        prev.from,
        prev.to,
        Precision.SENTENCE,
      );
      if (getPrecision(prev.from) !== Precision.SENTENCE) {
        return newSelection;
      }
      return expandSelection(document, newSelection, 1) || prev;
    });
  });

  useHotkeys("shift+ArrowLeft", () => {
    setSelectionRange((prev) => {
      if (prev === null) return prev;
      const newSelection = createSelection(prev.from, prev.to, Precision.WORD);
      if (getPrecision(prev.from) !== Precision.WORD) {
        return newSelection;
      }
      return expandSelection(document, newSelection, -1) || prev;
    });
  });

  useHotkeys("shift+ArrowRight", () => {
    setSelectionRange((prev) => {
      if (prev === null) return prev;
      const newSelection = createSelection(prev.from, prev.to, Precision.WORD);
      if (getPrecision(prev.from) !== Precision.WORD) {
        return newSelection;
      }
      return expandSelection(document, newSelection, 1) || prev;
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

  useHotkeys("alt+shift+ArrowLeft", () => {
    setSelectionRange((prev) => {
      if (prev === null) return prev;
      const newSelection = createSelection(
        prev.from,
        prev.to || clonePosition(prev.from),
        Precision.WORD,
      );
      if (getPrecision(prev.from) !== Precision.WORD) {
        return newSelection;
      }
      return {
        from: prev.from,
        to: getPrevPunctuationPosition(
          document,
          newSelection.to as WordPosition,
        ),
      };
    });
  });

  useHotkeys("alt+shift+ArrowRight", () => {
    setSelectionRange((prev) => {
      if (prev === null) return prev;
      const newSelection = createSelection(
        prev.from,
        prev.to || clonePosition(prev.from),
        Precision.WORD,
      );
      if (getPrecision(prev.from) !== Precision.WORD) {
        return newSelection;
      }
      return {
        from: prev.from,
        to: getNextPunctuationPosition(
          document,
          newSelection.to as WordPosition,
        ),
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

  // =============================================
  // entering into edit mode
  // =============================================

  // just select text by default going into editor mode
  useHotkeys("enter", (e) => {
    e.preventDefault();
    setEditorMode("edit");
  });
  // delete word by default when pressing backspace
  useHotkeys("backspace", () => {
    setEditorMode("edit");
  });

  // typing and replace when start typing in select mode
  useEventListener("keydown", (e) => {
    const modifierKeys = ["Alt", "Control", "Meta", "AltGraph"];
    const isPressingModifier = modifierKeys.some((key) =>
      e.getModifierState(key),
    );

    if (isPressingModifier) return;

    // go into edit mode for enter key
    if (e.key.length !== 1) {
      return;
    }
    setEditorMode("edit");
  });

  // selection range changed
  useEventListener("click", () => {
    if (hasSelectionRangeChanged) return;
    setSelectionLevel(Precision.WORD);
    clearSelection();
  });
  // =============================================

  useEffect(() => {
    if (inputMode === "keyboard") {
      window.document.body.style.cursor = "none"; // Fixed assignment operator
    } else {
      window.document.body.style.cursor = ""; // Fixed assignment operator
    }
  }, [inputMode]);
  useEventListener("mousemove", () => {
    setInputMode("mouse");
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
