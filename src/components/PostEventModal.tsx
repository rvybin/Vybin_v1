import { useState } from "react";
import { X } from "lucide-react";
import { createPortal } from "react-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

interface PostEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitted?: () => void;
}

export function PostEventModal({
  isOpen,
  onClose,
  onSubmitted,
}: PostEventModalProps) {
  const { user } = useAuth();

  const [title, setTitle] = useState("");
  const [organization, setOrganization] = useState("");
  const [eventType, setEventType] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");
  const [deadline, setDeadline] = useState("");
  const [link, setLink] = useState("");
  const [tags, setTags] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const MCGILL_RED = "#ED1B2F";

  if (!isOpen) return null;

  const resetForm = () => {
    setTitle("");
    setOrganization("");
    setEventType("");
    setDescription("");
    setLocation("");
    setDate("");
    setDeadline("");
    setLink("");
    setTags("");
    setImageUrl("");
    setError("");
    setSuccess(false);
  };

  const handleClose = () => {
    if (submitting) return;
    resetForm();
    onClose();
  };

  const toIsoOrNull = (value: string) => {
    if (!value.trim()) return null;
    return new Date(value).toISOString();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      setError("You must be signed in to post an event.");
      return;
    }

    if (!title.trim() || !organization.trim() || !date.trim()) {
      setError("Please fill in the title, organization, and date.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      const parsedTags = tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);

      const { error: insertError } = await (supabase as any).from("event_submissions").insert({
        title: title.trim(),
        organization: organization.trim(),
        event_type: eventType.trim() || null,
        description: description.trim() || null,
        location: location.trim() || null,
        date: new Date(date).toISOString(),
        deadline: toIsoOrNull(deadline),
        link: link.trim() || null,
        tags: parsedTags.length ? parsedTags : null,
        image_url: imageUrl.trim() || null,
        submitted_by: user.id,
        status: "pending",
      });

      if (insertError) throw insertError;

      setSuccess(true);

      setTimeout(() => {
        resetForm();
        onClose();
        onSubmitted?.();
      }, 1200);
    } catch (err: any) {
      console.error("Error submitting event:", err);
      setError(err?.message || "Failed to submit event.");
    } finally {
      setSubmitting(false);
    }
  };

  const modal = (
    <div className="fixed inset-0 z-[9999] flex items-end justify-center p-2 sm:items-center sm:p-4">
      <button
        aria-label="Close"
        onClick={handleClose}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
      />

      <div
        className="relative w-full max-w-2xl overflow-hidden rounded-[24px] border border-black/10 bg-white shadow-2xl sm:rounded-3xl"
        style={{ maxHeight: "min(92vh, 880px)", display: "flex", flexDirection: "column" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative border-b border-black/10">
          <div className="px-4 py-4 sm:px-6 sm:py-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="break-words text-lg font-extrabold tracking-tight text-black sm:text-2xl">
                  Post an Event
                </h2>
                <p className="mt-1 text-sm text-black/60">
                  Submit your event to Vybin for review.
                </p>
              </div>

              <button
                onClick={handleClose}
                className="rounded-full bg-white border border-black/10 p-2 hover:bg-black/5 transition"
                title="Close"
              >
                <X className="h-5 w-5 text-black/70" />
              </button>
            </div>
          </div>

          <div className="h-[2px]" style={{ background: MCGILL_RED }} />
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {success ? (
            <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-4 text-sm text-green-700">
              Your event was submitted successfully and is now pending review.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-sm font-semibold text-black">Event Title</label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm outline-none transition focus:border-[#ED1B2F]"
                    placeholder="AI Networking Night"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-black">Organization</label>
                  <input
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm outline-none transition focus:border-[#ED1B2F]"
                    placeholder="McGill Tech Society"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-black">Event Type</label>
                  <input
                    value={eventType}
                    onChange={(e) => setEventType(e.target.value)}
                    className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm outline-none transition focus:border-[#ED1B2F]"
                    placeholder="Workshop, Party, Mixer..."
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-black">Date & Time</label>
                  <input
                    type="datetime-local"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm outline-none transition focus:border-[#ED1B2F]"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-black">Deadline</label>
                  <input
                    type="datetime-local"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm outline-none transition focus:border-[#ED1B2F]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-sm font-semibold text-black">Location</label>
                  <input
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm outline-none transition focus:border-[#ED1B2F]"
                    placeholder="Trottier Building / Online / New Rez"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-sm font-semibold text-black">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={5}
                    className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm outline-none transition focus:border-[#ED1B2F]"
                    placeholder="Tell students what the event is about..."
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-sm font-semibold text-black">External Link</label>
                  <input
                    value={link}
                    onChange={(e) => setLink(e.target.value)}
                    className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm outline-none transition focus:border-[#ED1B2F]"
                    placeholder="https://..."
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-black">Tags</label>
                  <input
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm outline-none transition focus:border-[#ED1B2F]"
                    placeholder="tech, networking, startup"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-black">Image URL</label>
                  <input
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm outline-none transition focus:border-[#ED1B2F]"
                    placeholder="https://..."
                  />
                </div>
              </div>
            </form>
          )}
        </div>

        {!success ? (
          <div className="border-t border-black/10 bg-white p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={handleClose}
                className="w-full rounded-2xl py-3 font-semibold border border-black/15 bg-white transition hover:bg-black/5 sm:w-auto sm:px-6"
              >
                Cancel
              </button>

              <button
                type="submit"
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full rounded-2xl py-3 font-semibold text-white transition hover:opacity-90 disabled:opacity-60 sm:flex-1"
                style={{ background: MCGILL_RED }}
              >
                {submitting ? "Submitting..." : "Submit Event"}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}