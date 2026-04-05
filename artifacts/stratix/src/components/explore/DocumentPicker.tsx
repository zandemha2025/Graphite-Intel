import { useQueryClient } from "@tanstack/react-query";
import {
  useListDocuments,
  getListDocumentsQueryKey,
  useListConversationDocuments,
  getListConversationDocumentsQueryKey,
  useLinkDocumentToConversation,
  useUnlinkDocumentFromConversation,
} from "@workspace/api-client-react";
import { X, FileText } from "lucide-react";

type Props = {
  conversationId: number;
  onClose: () => void;
};

export function DocumentPicker({ conversationId, onClose }: Props) {
  const queryClient = useQueryClient();
  const { data: allDocs = [] } = useListDocuments({
    query: { queryKey: getListDocumentsQueryKey() },
  });
  const { data: linkedDocs = [] } = useListConversationDocuments(conversationId, {
    query: { queryKey: getListConversationDocumentsQueryKey(conversationId) },
  });
  const linkDoc = useLinkDocumentToConversation();
  const unlinkDoc = useUnlinkDocumentFromConversation();
  const linkedIds = new Set(linkedDocs.map((d) => d.id));
  const readyDocs = allDocs.filter((d) => d.status === "ready");

  const handleToggle = (docId: number) => {
    if (linkedIds.has(docId)) {
      unlinkDoc.mutate(
        { id: conversationId, data: { documentId: docId } },
        {
          onSuccess: () =>
            queryClient.invalidateQueries({
              queryKey: getListConversationDocumentsQueryKey(conversationId),
            }),
        }
      );
    } else {
      if (linkedIds.size >= 5) return;
      linkDoc.mutate(
        { id: conversationId, data: { documentId: docId } },
        {
          onSuccess: () =>
            queryClient.invalidateQueries({
              queryKey: getListConversationDocumentsQueryKey(conversationId),
            }),
        }
      );
    }
  };

  return (
    <div
      className="absolute bottom-full left-0 mb-2 w-72 rounded-lg shadow-lg z-10"
      style={{
        background: "var(--explore-card-bg, #FFFFFF)",
        border: "1px solid var(--explore-border, #E5E7EB)",
      }}
    >
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: "1px solid var(--explore-border, #E5E7EB)" }}
      >
        <span
          className="text-[10px] uppercase tracking-widest"
          style={{ color: "var(--explore-muted, #9CA3AF)" }}
        >
          Attach Documents
        </span>
        <button
          onClick={onClose}
          className="transition-colors"
          style={{ color: "var(--explore-muted, #9CA3AF)" }}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      {readyDocs.length === 0 ? (
        <div className="px-4 py-5 text-center">
          <p className="text-xs" style={{ color: "var(--explore-muted, #9CA3AF)" }}>
            No ready documents.
          </p>
          <p
            className="text-[10px] mt-1"
            style={{ color: "var(--explore-muted, #9CA3AF)", opacity: 0.7 }}
          >
            Upload from the Knowledge page.
          </p>
        </div>
      ) : (
        <div className="max-h-56 overflow-y-auto">
          {readyDocs.map((doc) => {
            const linked = linkedIds.has(doc.id);
            const atLimit = !linked && linkedIds.size >= 5;
            return (
              <button
                key={doc.id}
                onClick={() => handleToggle(doc.id)}
                disabled={atLimit}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                  atLimit ? "opacity-40 cursor-not-allowed" : "hover:bg-gray-50"
                }`}
                style={{
                  borderBottom: "1px solid #F3F4F6",
                  background: linked ? "var(--explore-accent-light, #EEF2FF)" : "transparent",
                }}
              >
                <div
                  className="w-3.5 h-3.5 border rounded flex items-center justify-center shrink-0"
                  style={{
                    borderColor: linked
                      ? "var(--explore-accent, #4F46E5)"
                      : "var(--explore-border, #D1D5DB)",
                  }}
                >
                  {linked && (
                    <span
                      className="w-1.5 h-1.5 rounded-sm"
                      style={{ background: "var(--explore-accent, #4F46E5)" }}
                    />
                  )}
                </div>
                <FileText
                  className="w-3 h-3 shrink-0"
                  style={{ color: "var(--explore-muted, #9CA3AF)" }}
                />
                <span
                  className="text-xs truncate"
                  style={{ color: "var(--explore-text, #374151)" }}
                >
                  {doc.title}
                </span>
                <span
                  className="text-[10px] uppercase ml-auto shrink-0"
                  style={{ color: "var(--explore-muted, #9CA3AF)" }}
                >
                  {doc.fileType}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
