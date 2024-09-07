import {
  createPosition,
  createSelection,
  getPrecision,
  ParagraphPosition,
  SentencePosition,
  useCursorState,
} from "../CursorStateProvider";
import { Paragraph, useDocument } from "../DocumentProvider";
import { SentenceBlock } from "./SentenceBlock";

type ParagraphBlockProps = {
  content: Paragraph;
  position: ParagraphPosition;
};
export const ParagraphBlock = ({ content, position }: ParagraphBlockProps) => {
  const {
    position: cursorPosition,
    selectionRange,
    setPosition,
    setSelectionRange,
    selectionLevel,
    selectFrom,
    selectTo,
  } = useCursorState();

  const { document } = useDocument();

  // clicking
  const handleMouseDown = () => {
    // auto select the last selection in the paragraph
    const lastSentence = document[position.paragraph].length - 1;
    const lastWord = document[position.paragraph][lastSentence].length - 1;

    const lastPositionInParagraph = createPosition(
      {
        paragraph: position.paragraph,
        sentence: lastSentence,
        word: lastWord,
      },
      selectionLevel,
    );
    selectFrom(lastPositionInParagraph);
  };

  const handleMouseEnter = () => {
    if (!selectionRange) return;

    // auto select the last selection in the paragraph
    const lastSentence = document[position.paragraph].length - 1;
    const lastWord = document[position.paragraph][lastSentence].length - 1;

    const lastPositionInParagraph = createPosition(
      {
        paragraph: position.paragraph,
        sentence: lastSentence,
        word: lastWord,
      },
      selectionLevel,
    );
    selectTo(lastPositionInParagraph);
  };

  return (
    <div
      onMouseDownCapture={handleMouseDown}
      onMouseEnterCapture={handleMouseEnter}
    >
      {content.map((content, index) => {
        return (
          <SentenceBlock
            position={{ paragraph: position.paragraph, sentence: index }}
            content={content}
            key={index}
          />
        );
      })}
    </div>
  );
};
