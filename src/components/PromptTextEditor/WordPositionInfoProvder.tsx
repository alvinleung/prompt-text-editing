import React, {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { WordPosition } from "./CursorStateProvider";
import { useDocument } from "./DocumentProvider";

type Props = {};

export type WordInfo = {
  line: number;
  position: WordPosition;
  pixelLeft: number;
  text: string;
};
type WordInfoUpdater = (wordInfo: WordInfo) => void;

type Line = {
  [key: string]: WordInfo;
};

interface ContextType {
  registerWordInfo: WordInfoUpdater;
  getWordVisualPositionInfo: (
    position: WordPosition
  ) => VisualPositionInfo | undefined;
  getWordBelow: (visualPosition: VisualPositionInfo) => WordInfo | undefined;
  getWordAbove: (visualPosition: VisualPositionInfo) => WordInfo | undefined;
}
type VisualPositionInfo = {
  line: number;
  pixelLeft: number;
};

const WordPositionContext = createContext<ContextType>({
  registerWordInfo: (() => {}) as WordInfoUpdater,
  //@ts-expect-error fuck off typescript i am prototyping
  getWordAbove: new Function(),
  //@ts-expect-error fuck off typescript i am prototyping
  getWordBelow: new Function(),
  //@ts-expect-error fuck off typescript i am prototyping
  getWordVisualPositionInfo: new Function(),
});
export const useWordPositionInfoRegistry = () =>
  useContext(WordPositionContext);

const getWordPositionHash = (position: WordPosition) =>
  `${position.paragraph}-${position.sentence}-${position.word}`;
const getHorizontalPositionHash = (wordInfo: WordInfo) =>
  `${wordInfo.pixelLeft}`;

const WordPositionInfoProvider = ({ children }: PropsWithChildren) => {
  const lines = useRef([] as Line[]);
  const visualPositionIndex = useRef(
    {} as { [key: string]: VisualPositionInfo }
  );

  const { document } = useDocument();
  useEffect(() => {
    // reset lines and visual position once document is updated
    lines.current = [];
    visualPositionIndex.current = {};
  }, [document]);

  const registerWordInfo = (wordInfo: WordInfo) => {
    // put info into the line based elements
    const visualPositionIndexArr = visualPositionIndex.current;
    const linesArr = lines.current;
    if (!linesArr[wordInfo.line]) linesArr[wordInfo.line] = {};
    linesArr[wordInfo.line][getHorizontalPositionHash(wordInfo)] = wordInfo;

    visualPositionIndexArr[getWordPositionHash(wordInfo.position)] = {
      line: wordInfo.line,
      pixelLeft: wordInfo.pixelLeft,
    };
  };

  const searchClosestWordInLine = (
    lines: Line[],
    lineNumber: number,
    pixelLeft: number
  ) => {
    let closestWord: WordInfo | undefined;
    let closestWordDist = 100000000;

    const lineArr = Object.values(lines[lineNumber]);
    if (!lineArr) {
      return;
    }

    for (let i = 0; i < lineArr.length; i++) {
      const currWord = lineArr[i];
      const distToWordAbs = Math.abs(currWord.pixelLeft - pixelLeft);
      if (distToWordAbs < closestWordDist) {
        closestWordDist = distToWordAbs;
        closestWord = currWord;
      }
    }

    return closestWord;
  };
  const getWordAbove = ({ line, pixelLeft }: VisualPositionInfo) => {
    const linesArr = lines.current;
    if (line - 1 < 0) return;
    return searchClosestWordInLine(linesArr, line - 1, pixelLeft);
  };
  const getWordBelow = ({ line, pixelLeft }: VisualPositionInfo) => {
    const linesArr = lines.current;
    if (line + 1 >= linesArr.length) return;
    return searchClosestWordInLine(linesArr, line + 1, pixelLeft);
  };
  const getWordVisualPositionInfo = (position: WordPosition) => {
    const visualPositionIndexArr = visualPositionIndex.current;
    return visualPositionIndexArr[getWordPositionHash(position)];
  };

  return (
    <WordPositionContext.Provider
      value={{
        registerWordInfo,
        getWordVisualPositionInfo,
        getWordAbove,
        getWordBelow,
      }}
    >
      {children}
    </WordPositionContext.Provider>
  );
};

export default WordPositionInfoProvider;
