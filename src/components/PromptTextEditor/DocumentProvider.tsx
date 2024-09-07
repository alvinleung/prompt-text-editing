/**
 *
 * Content
 * - paragraph[]
 *   - sentence[]
 *     - word
 *     - variable
 *
 */

import { createContext, useContext, useMemo } from "react";

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
  const paragraph = text.split(".").map((text) => createSentence(text));
  return paragraph;
}

export type Document = Paragraph[];
function createDocument(text: string): Document {
  const document = text.split("\n").map((text) => createParagraph(text));
  return document;
}

const CONTENT = `
I'm going to give you a document. Then I'm going to ask you a question about it. I'd like you to first write down exact quotes of parts of the document that would help answer the question, and then I'd like you to answer the question using facts from the quoted content. Here is the document:

<document>
{TEXT}
</document>

First, find the quotes from the document that are most relevant to answering the question, and then print them in numbered order. Quotes should be relatively short.

If there are no relevant quotes, write "No relevant quotes" instead.

Then, answer the question, starting with "Answer:".  Do not include or reference quoted content verbatim in the answer. Don't say "According to Quote [1]" when answering. Instead make references to quotes relevant to each section of the answer solely by adding their bracketed numbers at the end of relevant sentences.

Thus, the format of your overall response should look like what's shown between the <example></example> tags.  Make sure to follow the formatting and spacing exactly.

Here is the first question: {QUESTION}

If the question cannot be answered by the document, say so.

Answer the question immediately without preamble.
`;

const EditorContentContext = createContext({
  document: [] as Document,
});
export function useDocument() {
  return useContext(EditorContentContext);
}
type Props = {};
export function DocumentProvider({ children }: React.PropsWithChildren<Props>) {
  const document = useMemo(() => {
    return createDocument(CONTENT);
  }, []);
  return (
    <EditorContentContext.Provider value={{ document }}>
      {children}
    </EditorContentContext.Provider>
  );
}
