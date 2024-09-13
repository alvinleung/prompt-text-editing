/**
 *
 * Content
 * - paragraph[]
 *   - sentence[]
 *     - word
 *     - variable
 *
 */

import { createContext, useContext, useMemo, useState } from "react";
import {
  BlockPosition,
  clonePosition,
  convertSelectionPrecision,
  getSelectionBoundSorted,
  getSelectionPrecision,
  Precision,
  SelectionRange,
  SentencePosition,
  WordPosition,
} from "./CursorStateProvider";
import { Position } from "postcss";

interface Variable {
  id: string;
  label: string;
}

export type Sentence = (string | Variable)[];

function createSentence(text: string): Sentence {
  const words = text.split(" ");
  return words;
}

export type Paragraph = Sentence[];

function createParagraph(text: string): Paragraph {
  const paragraph = text
    .replace(/([.?!])\s*(?=[A-Z])/g, "$1|")
    .split("|")
    .map((text) => createSentence(text));
  return paragraph;
}

export type Document = Paragraph[];
function createDocument(text: string): Document {
  const document = text.split("\n").map((text) => createParagraph(text));
  return document;
}
/*

const CONTENT = `
I'm going to give you a restaurant's menu. Then I'm going to ask you to identify which menu items match a given spoken order. I'd like you to first write down exact quotes from the menu that correspond to the spoken order, and then I'd like you to identify the menu items using facts from the quoted content. Here is the menu:

<menu>
  {MENU}
</menu>

First, find the quotes from the menu that are most relevant to identifying the matching menu items, and then print them in numbered order. Quotes should be relatively short.

If there are no relevant quotes, write "No relevant quotes" instead.

Then, identify the matching menu items, starting with "Matched Items:". Do not include or reference quoted content verbatim in your identification. Don't say "According to Quote [1]" when identifying items. Instead, make references to quotes relevant to each section of the identification solely by adding their bracketed numbers at the end of relevant sentences.

Thus, the format of your overall response should look like what's shown between the <example></example> tags. Make sure to follow the formatting and spacing exactly.

Here is the spoken order:
{ORDER}

If no items can be matched from the menu, say so.
Identify the items immediately without preamble.
`
  .trimStart()
  .trimEnd();

*/
export const CONTENT = `
I'm going to give you a restaurant's menu. Then I'm going to ask you to identify which menu items match a given spoken order. I'd like you to first write down exact quotes from the menu that correspond to the spoken order, and then I'd like you to identify the menu items using facts from the quoted content. Here is the menu:

<menu>
  {MENU}
</menu>

First, find the quotes from the menu that are most relevant to identifying the matching menu items, and then print them in numbered order. Quotes should be relatively short.

If there are no relevant quotes, write "No relevant quotes" instead.

Then, identify the matching menu items, starting with "Matched Items:". Do not include or reference quoted content verbatim in your identification. Don't say "According to Quote [1]" when identifying items. Instead, make references to quotes relevant to each section of the identification solely by adding their bracketed numbers at the end of relevant sentences.

Thus, the format of your overall response should look like what's shown between the <example></example> tags. Make sure to follow the formatting and spacing exactly.

Here is the spoken order:
{ORDER}

If no items can be matched from the menu, say so.
Identify the items immediately without preamble.
`
  .trimStart()
  .trimEnd();

const EditorContentContext = createContext({
  document: [] as Document,
  rawText: "",
  updateDocument: (newString: string) => {},
  moveSentence: (
    from: SelectionRange,
    to: SentencePosition,
    insertion: "before" | "after"
  ) => {},
  insertWord: (position: WordPosition, word: string) => {},
  deleteWord: (position: WordPosition) => {},
  updateWord: (position: WordPosition, word: string) => {},
  getWord: (position: WordPosition) => {},
});
export function useDocument() {
  return useContext(EditorContentContext);
}

type Props = {
  promptText: string;
  onPromptTextUpdate: (latest: string) => void;
};

export function DocumentProvider({
  children,
  promptText = CONTENT,
  onPromptTextUpdate,
}: React.PropsWithChildren<Props>) {
  const document = useMemo(() => {
    return createDocument(promptText);
  }, [promptText]);

  const [documentState, setDocumentState] = useState(document);

  const updateWord = (position: WordPosition, word: string) => {
    setDocumentState((prev) => {
      prev[position.paragraph][position.sentence][position.word] = word;
      return prev;
    });
  };

  const insertWord = (position: WordPosition, word: string) => {
    setDocumentState((prev) => {
      prev[position.paragraph][position.sentence].splice(
        position.word,
        0,
        word
      );
      return prev;
    });
  };

  const deleteWord = (position: WordPosition) => {
    setDocumentState((prev) => {
      prev[position.paragraph][position.sentence].splice(position.word, 1);
      return prev;
    });
  };

  const getWord = (position: WordPosition) => {
    return documentState[position.paragraph][position.sentence][position.word];
  };
  const updateDocument = (newDocumentString: string) => {
    onPromptTextUpdate(newDocumentString);
    setDocumentState(createDocument(newDocumentString));
  };
  const moveSentence = (
    from: SelectionRange, // Contains from.paragraph and from.sentence
    to: SentencePosition, // Contains to.paragraph and to.sentence
    insertion: "before" | "after" // Determines where to insert the moved sentence
  ) => {
    setDocumentState((prev) => {
      const newDocument = [...prev]; // Shallow copy of the current document
      // Get the 'from' position
      const fromParagraphIndex = from.from.paragraph;
      const fromSentenceIndex = from.from.sentence;

      // Get the 'to' position
      const toParagraphIndex = to.paragraph;
      let toSentenceIndex = to.sentence;

      // Get the sentences in the 'from' and 'to' paragraphs
      const fromParagraphSentences = [...newDocument[fromParagraphIndex]];
      const toParagraphSentences = [...newDocument[toParagraphIndex]];

      // Remove the sentence from the 'from' position
      const [movedSentence] = fromParagraphSentences.splice(
        fromSentenceIndex,
        1
      );

      // Adjust the index only if moving within the same paragraph
      if (fromParagraphIndex === toParagraphIndex) {
        if (fromSentenceIndex < toSentenceIndex) {
          // If the sentence is being moved forward within the same paragraph, adjust the index
          toSentenceIndex -= 1;
        }
        // Insert the sentence in the same paragraph
        if (insertion === "before") {
          fromParagraphSentences.splice(toSentenceIndex, 0, movedSentence);
        } else {
          fromParagraphSentences.splice(toSentenceIndex + 1, 0, movedSentence);
        }

        // Update the paragraph in newDocument
        newDocument[fromParagraphIndex] = fromParagraphSentences;
      } else {
        // Insert the sentence into a different paragraph
        if (insertion === "before") {
          toParagraphSentences.splice(toSentenceIndex, 0, movedSentence);
        } else {
          toParagraphSentences.splice(toSentenceIndex + 1, 0, movedSentence);
        }

        // Update both paragraphs in newDocument
        newDocument[fromParagraphIndex] = fromParagraphSentences;
        newDocument[toParagraphIndex] = toParagraphSentences;
      }

      const str = convertDocumentToString(newDocument, from);
      onPromptTextUpdate(str.result);

      // Return the new document state
      return newDocument;
    });
  };

  return (
    <EditorContentContext.Provider
      value={{
        moveSentence,
        document: documentState,
        updateDocument,
        insertWord,
        deleteWord,
        updateWord,
        getWord,
        rawText: CONTENT,
      }}
    >
      {children}
    </EditorContentContext.Provider>
  );
}

export function convertDocumentToString(
  document: Document,
  range: SelectionRange
) {
  let result = "";

  let selectionBeginIndex = 0;
  let selectionEndIndex = 0;

  const sortedRange = getSelectionBoundSorted(range);

  const upperBound = clonePosition(sortedRange.upperBound);
  const lowerBound = clonePosition(sortedRange.lowerBound);

  // if the selection range is sentence, convert it to word
  if (getSelectionPrecision(range) === Precision.SENTENCE) {
    lowerBound.word = 0;
    upperBound.word =
      document[upperBound.paragraph][upperBound.sentence].length - 1;
  }

  for (let i = 0; i < document.length; i++) {
    let paragraphResult = "";
    const paragraph = document[i];

    for (let j = 0; j < paragraph.length; j++) {
      let sentenceResult = "";
      const sentence = paragraph[j];

      for (let k = 0; k < sentence.length; k++) {
        const word = sentence[k];

        if (
          lowerBound.paragraph === i &&
          lowerBound.sentence === j &&
          lowerBound.word === k
        ) {
          // this is the beginning of the selection
          selectionBeginIndex =
            result.length + sentenceResult.length + paragraphResult.length;
        }

        sentenceResult += typeof word === "string" ? word : word.label; // Assuming 'label' is the string representation of Variable
        sentenceResult += " "; // Add space between words

        if (
          upperBound.paragraph === i &&
          upperBound.sentence === j &&
          upperBound.word === k
        ) {
          // this is the ending of the selection
          selectionEndIndex =
            result.length + sentenceResult.length + paragraphResult.length;
        }
      }

      paragraphResult += sentenceResult; // Join sentences with a period and space
    }

    result += paragraphResult.trimEnd() + "\n"; // Join paragraphs with a newline
  }

  return {
    result: result.trimEnd(),
    selectionBegin: selectionBeginIndex,
    selectionEnd: selectionEndIndex,
    selection: result.substring(selectionBeginIndex, selectionEndIndex),
  };
}

export function getWordPositionFromRawTextSelection(
  documentSource: string,
  begin: number,
  end: number
): SelectionRange {
  // Updated return type
  const paragraphs = documentSource.split("\n");
  let charCount = 0;
  let startPosition: WordPosition | null = null;
  let endPosition: WordPosition | null = null;

  for (let p = 0; p < paragraphs.length; p++) {
    const sentences = paragraphs[p]
      .replace(/([.?!])\s*(?=[A-Z])/g, "$1|")
      .split("|");

    for (let s = 0; s < sentences.length; s++) {
      const words = sentences[s].split(" ");

      for (let w = 0; w < words.length; w++) {
        const wordLength = words[w].length + 1; // +1 for space

        if (charCount + wordLength > begin && !startPosition) {
          startPosition = { paragraph: p, sentence: s, word: w }; // Capture start position
        }
        const isBeginAndEndSame = begin === end;
        if (
          // to fix edge case of selection
          ((!isBeginAndEndSame && charCount + wordLength > end - 1) ||
            (isBeginAndEndSame && charCount + wordLength > end)) &&
          !endPosition
        ) {
          endPosition = { paragraph: p, sentence: s, word: w }; // Capture end position
        }

        charCount += wordLength;
      }
    }
  }

  if (!startPosition || !endPosition) {
    throw new Error("Selection range is out of bounds.");
  }

  return { from: startPosition, to: endPosition }; // Return both positions
}
