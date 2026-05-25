import React from "react";

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
    if (!isOpen) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-lg w-full relative">
                <button
                    onClick={onClose}
                    className="absolute top-1 right-3 text-gray-500 hover:text-gray-800 text-2xl"
                >
                    &times;
                </button>
                {title && <h2 className="text-2xl font-bold mb-4">{title}</h2>}
                <div className="modal-content">{children}</div>
            </div>
        </div>
    );
}
