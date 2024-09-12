import { diffWords, diffWordsWithSpace, diffSentences } from "diff";
import React from "react";
import { useEffect, useMemo } from "react";

type Props = {
  before: string;
  after: string;
};
const DiffViewer = ({ before, after }: Props) => {
  const diffResult = useMemo(() => {
    return diffWords(before, after);
  }, [before, after]);

  return (
    <>
      {diffResult &&
        diffResult.map((result, index) => {
          const splittedValue = result.value.split("\n");
          return (
            <span
              key={index}
              className={`${result.removed && "line-through text-zinc-500"} ${result.added && "text-green-400"}`}
            >
              {splittedValue.map(function (item, idx) {
                return (
                  <React.Fragment key={idx}>
                    {item}
                    {idx !== splittedValue.length - 1 && <br />}
                  </React.Fragment>
                );
              })}
            </span>
          );
        })}
    </>
  );
};

export default DiffViewer;
