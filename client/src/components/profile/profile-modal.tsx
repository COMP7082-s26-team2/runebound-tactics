'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { getProfile, updateUsername, uploadAvatar, verifyCurrentPassword, updatePassword } from '@/lib/profile/actions';
import { signOut } from '@/app/auth/actions';

const DEFAULT_AVATAR = '/assets/default-avatar.svg';

interface ProfileData {
    player_id: bigint | string;
    username: string | null;
    email: string | null;
    avatar_url: string | null;
}

export default function ProfileModal() {
    const [isOpen, setIsOpen] = useState(false);
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Username editing
    const [editingName, setEditingName] = useState(false);
    const [newUsername, setNewUsername] = useState('');
    const [savingName, setSavingName] = useState(false);

    // Avatar upload
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Password Change Flow
    const [passwordStep, setPasswordStep] = useState<'idle' | 'verify' | 'update'>('idle');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [verifyingPassword, setVerifyingPassword] = useState(false);
    const [updatingPassword, setUpdatingPassword] = useState(false);
    const [pwError, setPwError] = useState<string | null>(null);
    const [pwSuccess, setPwSuccess] = useState<string | null>(null);

    const fetchProfile = async () => {
        setLoading(true);
        setError(null);
        const result = await getProfile();

        if (result.error) {
            setError(result.error);
        } else if (result.profile) {
            setProfile(result.profile as ProfileData);
            setNewUsername(result.profile.username || '');
        }
        setLoading(false);
    }

    useEffect(() => {
        fetchProfile();
    }, []);

    function handleOpen() {
        setIsOpen(true);
        setError(null);
        setSuccess(null);
    }

    function handleClose() {
        setIsOpen(false);
        setEditingName(false);
        setError(null);
        setSuccess(null);
        // Reset password states
        setPasswordStep('idle');
        setCurrentPassword('');
        setNewPassword('');
        setPwError(null);
        setPwSuccess(null);
    }

    function handleCancelPassword() {
        setPasswordStep('idle');
        setCurrentPassword('');
        setNewPassword('');
        setPwError(null);
        setPwSuccess(null);
    }

    async function handleVerifyPassword() {
        if (!currentPassword) {
            setPwError('Current password is required.');
            return;
        }
        setVerifyingPassword(true);
        setPwError(null);
        setPwSuccess(null);

        const result = await verifyCurrentPassword(currentPassword);
        setVerifyingPassword(false);

        if (result.error) {
            setPwError(result.error);
        } else {
            setPasswordStep('update');
        }
    }

    async function handleUpdatePassword() {
        if (!newPassword) {
            setPwError('New password is required.');
            return;
        }

        // Simple client-side regex check (matches actions.ts)
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
        if (!passwordRegex.test(newPassword)) {
            setPwError('Password must be at least 8 characters long and include an uppercase letter, a lowercase letter, a number, and a symbol.');
            return;
        }

        if (currentPassword === newPassword) {
            setPwError('New password must be different from current password.');
            return;
        }

        setUpdatingPassword(true);
        setPwError(null);
        setPwSuccess(null);

        const result = await updatePassword(newPassword);
        setUpdatingPassword(false);

        if (result.error) {
            setPwError(result.error);
        } else {
            setPwSuccess('Password updated successfully.');
            setPasswordStep('idle');
            setCurrentPassword('');
            setNewPassword('');
        }
    }


    async function handleSaveUsername() {
        if (!newUsername.trim()) {
            setError('Username cannot be empty.');
            return;
        }
        setSavingName(true);
        setError(null);
        setSuccess(null);

        const result = await updateUsername(newUsername.trim());
        setSavingName(false);

        if (result.error) {
            setError(result.error);
        } else {
            setSuccess('Username updated.');
            setEditingName(false);
            if (profile) {
                setProfile({ ...profile, username: newUsername.trim() });
            }
        }
    }

    async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        setError(null);
        setSuccess(null);

        const formData = new FormData();
        formData.append('avatar', file);

        const result = await uploadAvatar(formData);
        setUploading(false);

        if (result.error) {
            setError(result.error);
        } else if (result.avatar_url) {
            setSuccess('Profile picture updated.');
            if (profile) {
                setProfile({ ...profile, avatar_url: result.avatar_url });
            }
        }

        // Reset input so re-selecting the same file triggers onChange
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }

    async function handleSignOut() {
        await signOut();
    }


    const avatarSrc = profile?.avatar_url || DEFAULT_AVATAR;


    return (
        <>
            {/* Profile Trigger Button — positioned overlay */}
            <button
                id="profile-trigger-btn"
                onClick={handleOpen}
                className="absolute top-4 right-4 z-50 group"
                title="Open Profile"
            >
                <div className="w-10 h-10 rounded-full border-2 border-[#333333] overflow-hidden bg-[#1a1a1a] transition-all duration-200 group-hover:border-[#66ff66] group-hover:shadow-[0_0_12px_rgba(102,255,102,0.3)]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={profile?.avatar_url || DEFAULT_AVATAR}
                        alt="Profile"
                        className="w-full h-full object-cover"
                    />
                </div>
            </button>

            {/* Modal Backdrop + Panel */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center transition-opacity duration-200 ease-out"
                >
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                        onClick={handleClose}
                    />

                    {/* Panel */}
                    <div
                        className="relative w-full max-w-sm mx-4 bg-[#111111]/95 border border-[#222222] backdrop-blur-md shadow-2xl transition-transform duration-200 ease-out"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-[#222222]">
                            <span className="text-[10px] uppercase tracking-[0.2em] text-[#666666] font-bold">
                                Player Profile
                            </span>
                            <button
                                id="profile-close-btn"
                                onClick={handleClose}
                                className="text-[#555555] hover:text-[#ff6666] transition-colors"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Body */}
                        <div className="px-6 py-6 space-y-6">
                            {loading ? (
                                <div className="text-center py-8">
                                    <div className="w-6 h-6 border-2 border-[#333333] border-t-[#66ff66] rounded-full animate-spin mx-auto" />
                                    <p className="text-[10px] uppercase tracking-widest text-[#555555] mt-3">Loading Profile...</p>
                                </div>
                            ) : (
                                <>
                                    {/* Avatar Section */}
                                    <div className="flex flex-col items-center space-y-3">
                                        <button
                                            id="avatar-upload-btn"
                                            onClick={() => fileInputRef.current?.click()}
                                            className="relative group"
                                            disabled={uploading}
                                            title="Change profile picture"
                                        >
                                            <div className="w-24 h-24 rounded-full border-2 border-[#333333] overflow-hidden bg-[#1a1a1a] transition-all duration-200 group-hover:border-[#66ff66]">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img
                                                    src={avatarSrc}
                                                    alt="Avatar"
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                            {/* Hover overlay */}
                                            <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                {uploading ? (
                                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                ) : (
                                                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    </svg>
                                                )}
                                            </div>
                                        </button>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/png,image/jpeg,image/webp"
                                            onChange={handleAvatarChange}
                                            className="hidden"
                                        />
                                        <p className="text-[9px] uppercase tracking-widest text-[#444444]">
                                            Click avatar to change • Max 2MB
                                        </p>
                                    </div>

                                    {/* Username Field */}
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] uppercase tracking-[0.2em] text-[#666666] font-bold">
                                            Username
                                        </label>
                                        {editingName ? (
                                            <div className="flex gap-2">
                                                <input
                                                    id="username-edit-input"
                                                    type="text"
                                                    value={newUsername}
                                                    onChange={(e) => setNewUsername(e.target.value)}
                                                    className="flex-1 bg-[#1a1a1a] border border-[#333333] px-4 py-3 text-sm focus:outline-none focus:border-[#555555] transition-colors text-white"
                                                    autoFocus
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') handleSaveUsername();
                                                        if (e.key === 'Escape') {
                                                            setEditingName(false);
                                                            setNewUsername(profile?.username || '');
                                                        }
                                                    }}
                                                />
                                                <button
                                                    id="username-save-btn"
                                                    onClick={handleSaveUsername}
                                                    disabled={savingName}
                                                    className="px-3 bg-[#333333] hover:bg-[#444444] text-white text-[10px] uppercase tracking-widest font-bold transition-colors disabled:opacity-50"
                                                >
                                                    {savingName ? '...' : 'Save'}
                                                </button>
                                            </div>
                                        ) : (
                                            <div
                                                id="username-display"
                                                onClick={() => setEditingName(true)}
                                                className="bg-[#1a1a1a] border border-[#333333] px-4 py-3 text-sm text-white cursor-pointer hover:border-[#555555] transition-colors flex items-center justify-between"
                                            >
                                                <span>{profile?.username || 'No username set'}</span>
                                                <span className="flex items-center gap-1.5 text-[9px] uppercase tracking-wider text-[#66ff66] font-bold">
                                                    Change
                                                    <svg className="w-3.5 h-3.5 text-[#66ff66]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                    </svg>
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Email Field (read-only) */}
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] uppercase tracking-[0.2em] text-[#666666] font-bold">
                                            Email
                                        </label>
                                        <div
                                            id="email-display"
                                            className="bg-[#0f0f0f] border border-[#222222] px-4 py-3 text-sm text-[#666666] cursor-not-allowed"
                                        >
                                            {profile?.email || 'No email'}
                                        </div>
                                        <p className="text-[9px] uppercase tracking-widest text-[#333333]">
                                            Email cannot be changed
                                        </p>
                                    </div>

                                    {/* Password Field */}
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] uppercase tracking-[0.2em] text-[#666666] font-bold">
                                            Password
                                        </label>

                                        {pwSuccess && (
                                            <div className="text-[9px] uppercase tracking-wide text-[#66ff66] bg-[#112d11] border border-[#224d22] px-3 py-2">
                                                {pwSuccess}
                                            </div>
                                        )}

                                        {passwordStep === 'idle' ? (
                                            <div
                                                id="password-display"
                                                onClick={() => {
                                                    setPasswordStep('verify');
                                                    setPwError(null);
                                                    setPwSuccess(null);
                                                }}
                                                className="bg-[#1a1a1a] border border-[#333333] px-4 py-3 text-sm text-white cursor-pointer hover:border-[#555555] transition-colors flex items-center justify-between"
                                            >
                                                <span className="text-[#555555]">••••••••</span>
                                                <span className="flex items-center gap-1.5 text-[9px] uppercase tracking-wider text-[#66ff66] font-bold">
                                                    Change
                                                    <svg className="w-3.5 h-3.5 text-[#66ff66]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                    </svg>
                                                </span>
                                            </div>
                                        ) : (
                                            <div className="border border-[#222222] bg-[#151515] p-4 space-y-3 transition-all duration-300">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[9px] uppercase tracking-widest text-[#666666] font-bold">
                                                        {passwordStep === 'verify' ? 'Verify Current Password' : 'Enter New Password'}
                                                    </span>
                                                </div>

                                                {passwordStep === 'verify' && (
                                                    <div className="space-y-2.5 transition-opacity duration-200 ease-out">
                                                        <div className="space-y-1">
                                                            <input
                                                                type="password"
                                                                placeholder="Current Password"
                                                                value={currentPassword}
                                                                onChange={(e) => setCurrentPassword(e.target.value)}
                                                                className="w-full bg-[#1a1a1a] border border-[#333333] px-3 py-2 text-xs focus:outline-none focus:border-[#555555] transition-colors text-white placeholder-[#444444]"
                                                                autoFocus
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') handleVerifyPassword();
                                                                    if (e.key === 'Escape') handleCancelPassword();
                                                                }}
                                                            />
                                                        </div>
                                                        {pwError && (
                                                            <div className="text-[9px] text-[#ff6666] bg-[#2d1111] border border-[#4d2222] px-2.5 py-1.5 leading-snug">
                                                                {pwError}
                                                             </div>
                                                        )}
                                                        <div className="flex gap-2 justify-end">
                                                            <button
                                                                type="button"
                                                                onClick={handleCancelPassword}
                                                                className="px-2.5 py-1.5 bg-[#222222] hover:bg-[#333333] text-white text-[9px] uppercase tracking-wider font-bold transition-colors"
                                                            >
                                                                Cancel
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={handleVerifyPassword}
                                                                disabled={verifyingPassword}
                                                                className="px-3 py-1.5 bg-[#66ff66] hover:bg-[#52cc52] text-black text-[9px] uppercase tracking-wider font-bold transition-colors disabled:opacity-50 flex items-center gap-1"
                                                            >
                                                                {verifyingPassword ? 'Verifying...' : 'Next'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}

                                                {passwordStep === 'update' && (
                                                    <div className="space-y-2.5 transition-opacity duration-200 ease-out">
                                                        <div className="space-y-1">
                                                            <input
                                                                type="password"
                                                                placeholder="••••••••"
                                                                value={newPassword}
                                                                onChange={(e) => setNewPassword(e.target.value)}
                                                                className="w-full bg-[#1a1a1a] border border-[#333333] px-3 py-2 text-xs focus:outline-none focus:border-[#555555] transition-colors text-white placeholder-[#444444]"
                                                                autoFocus
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') handleUpdatePassword();
                                                                    if (e.key === 'Escape') handleCancelPassword();
                                                                }}
                                                            />
                                                            <p className="text-[9px] text-[#444444] leading-tight mt-1">
                                                                Must be 8+ chars with uppercase, lowercase, digit, and symbol (@$!%*?&#)
                                                            </p>
                                                        </div>
                                                        {pwError && (
                                                            <div className="text-[9px] text-[#ff6666] bg-[#2d1111] border border-[#4d2222] px-2.5 py-1.5 leading-snug">
                                                                {pwError}
                                                            </div>
                                                        )}
                                                        <div className="flex gap-2 justify-end">
                                                            <button
                                                                type="button"
                                                                onClick={handleCancelPassword}
                                                                className="px-2.5 py-1.5 bg-[#222222] hover:bg-[#333333] text-white text-[9px] uppercase tracking-wider font-bold transition-colors"
                                                            >
                                                                Cancel
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={handleUpdatePassword}
                                                                disabled={updatingPassword}
                                                                className="px-3 py-1.5 bg-[#66ff66] hover:bg-[#52cc52] text-black text-[9px] uppercase tracking-wider font-bold transition-colors disabled:opacity-50"
                                                            >
                                                                {updatingPassword ? 'Saving...' : 'Update Password'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                         )}
                                     </div>
                                 </>
                            )}

                            {/* Status Messages */}
                            {error && (
                                <div className="p-3 bg-[#2d1111] border border-[#4d2222] text-[#ff6666] text-[10px] font-medium uppercase tracking-tight leading-normal">
                                    Error: {error}
                                </div>
                            )}

                            {success && (
                                <div className="p-3 bg-[#112d11] border border-[#224d22] text-[#66ff66] text-[10px] font-medium uppercase tracking-tight leading-normal">
                                    {success}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 border-t border-[#222222] space-y-3">
                            <button
                                id="profile-logout-btn"
                                onClick={handleSignOut}
                                className="w-full h-10 border border-[#ff6666]/30 hover:border-[#ff6666]/70 hover:bg-[#ff6666]/10 text-[#ff6666] font-bold uppercase tracking-widest text-[10px] transition-all duration-200"
                            >
                                Log Out
                            </button>
                            <button
                                id="profile-close-footer-btn"
                                onClick={handleClose}
                                className="w-full h-10 bg-[#222222] hover:bg-[#333333] text-white font-bold uppercase tracking-widest text-[10px] transition-colors"
                            >
                                Close
                            </button>
                        </div>

                    </div>
                </div>
            )}
        </>
    );
}
