/** English story text with each Arabic run isolated (bdi), so punctuation stays on its side. */
export function ArabicText({ text }: { text: string }) {
  return (
    <>
      {text.split(/([؀-ۿ]+(?:\s+[؀-ۿ]+)*)/).map((part, i) =>
        i % 2 ? (
          <bdi key={i} lang="ar" dir="rtl" className="arabic-run">
            {part}
          </bdi>
        ) : (
          part
        ),
      )}
    </>
  );
}
