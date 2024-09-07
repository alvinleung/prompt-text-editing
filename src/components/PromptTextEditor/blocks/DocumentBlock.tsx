import React from "react";
import { ParagraphBlock } from "./ParagraphBlock";
import { useDocument } from "../DocumentProvider";

type Props = {};

const DocumentBlock = (props: Props) => {
  const { document } = useDocument();
  return (
    <div className="select-none p-4 max-w-[56ch] text-[14px] mx-auto leading-none">
      {document.map((paragraph, index) => (
        <ParagraphBlock
          content={paragraph}
          position={{ paragraph: index }}
          key={index}
        />
      ))}
    </div>
  );
};

export default DocumentBlock;
