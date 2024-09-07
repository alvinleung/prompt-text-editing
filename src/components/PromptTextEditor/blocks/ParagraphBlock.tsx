import { ParagraphPosition } from "../CursorStateProvider";
import { Paragraph } from "../DocumentProvider";
import { SentenceBlock } from "./SentenceBlock";

type ParagraphBlockProps = {
  content: Paragraph;
  position: ParagraphPosition;
};
export const ParagraphBlock = ({ content, position }: ParagraphBlockProps) => {
  return (
    <div>
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
