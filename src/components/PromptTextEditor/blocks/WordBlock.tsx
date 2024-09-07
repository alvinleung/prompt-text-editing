import { getWordPositionAbs, WordPosition } from "../CursorStateProvider";
import { useDocument } from "../DocumentProvider";

type WordBlockProp = {
  content: string;
  isSelected: boolean;
  position: WordPosition;
};
export const WordBlock = ({ content, isSelected, position }: WordBlockProp) => {
  const { document } = useDocument();
  const handleSelect = () => {
    // console.log(getWordPositionAbs(document, position));
  };
  return (
    <span
      onClick={handleSelect}
      className={`inline-block py-[4px] ${isSelected ? "bg-gray-800" : ""}`}
    >
      {content}
    </span>
  );
};
