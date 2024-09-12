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
          const isNextDiffResultAdded =
            index !== diffResult.length - 1 && diffResult[index + 1].added;

          const MAX_DELETED_LENGTH = 150;

          const shouldShowDeleted = result.removed && !isNextDiffResultAdded;

          return (
            <span
              key={index}
              className={`${!result.removed && !result.added && "opacity-100"} ${result.removed && "line-through opacity-40"} ${result.added && "bg-zinc-700 opacity-100"}`}
            >
              {shouldShowDeleted &&
                result.value.length >= MAX_DELETED_LENGTH && (
                  <>
                    {`[${truncateString(result.value, MAX_DELETED_LENGTH)}]`}
                    {turnTrailingLineBreakIntoBR(result.value)}
                  </>
                )}
              {(!result.removed ||
                (shouldShowDeleted &&
                  result.value.length < MAX_DELETED_LENGTH)) &&
                splittedValue.map(function (item, idx) {
                  return (
                    <React.Fragment key={idx}>
                      <span>{item}</span>
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

function truncateString(str: string, maxLength: number): string {
  if (str.length <= maxLength) {
    return str;
  }

  const prefixLength = Math.floor((maxLength - 3) / 2);
  const suffixLength = maxLength - prefixLength - 3;

  const prefix = str.substring(0, prefixLength);
  const suffix = str.substring(str.length - suffixLength);

  return `${prefix}...${suffix}`;
}

function turnTrailingLineBreakIntoBR(str: string) {
  const lineBreaks: React.ReactNode[] = [];

  console.log(JSON.stringify(str));
  for (let i = str.length - 1; i >= 0; i--) {
    if (str[i] === "\n") {
      lineBreaks.push(<br />);
      continue;
    }
    break;
  }
  console.log(lineBreaks);

  return lineBreaks;
}

export default DiffViewer;
