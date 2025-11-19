"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface WriterContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  writer: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
  };
  onSave: (email: string | undefined, phone: string | undefined) => void;
}

export function WriterContactModal({
  isOpen,
  onClose,
  writer,
  onSave
}: WriterContactModalProps) {
  const [email, setEmail] = useState(writer.email || "");
  const [phone, setPhone] = useState(writer.phone || "");

  // Update local state when writer prop changes
  useEffect(() => {
    setEmail(writer.email || "");
    setPhone(writer.phone || "");
  }, [writer]);

  const handleSave = () => {
    onSave(
      email.trim() || undefined,
      phone.trim() || undefined
    );
    onClose();
  };

  const handleCancel = () => {
    // Reset to original values
    setEmail(writer.email || "");
    setPhone(writer.phone || "");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Contact Information</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="writerName">Writer Name</Label>
            <Input
              id="writerName"
              value={writer.name}
              disabled
              className="bg-muted"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="writerEmail">Email</Label>
            <Input
              id="writerEmail"
              type="email"
              placeholder="email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Optional: Contact email for this writer on this project
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="writerPhone">Phone</Label>
            <Input
              id="writerPhone"
              type="tel"
              placeholder="+92 XXX XXXXXXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Optional: Contact phone for this writer on this project
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Contact Info
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
