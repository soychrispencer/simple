import { z } from 'zod';

export const publicProfileAccountKindSchema = z.enum(['individual', 'independent', 'company']);
export const publicProfileLeadRoutingModeSchema = z.enum(['owner', 'round_robin', 'unassigned']);
export const publicProfileDayIdSchema = z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']);
export const publicProfileSocialLinksSchema = z.object({
    instagram: z.string().trim().max(120).nullable().optional().default(null),
    facebook: z.string().trim().max(120).nullable().optional().default(null),
    linkedin: z.string().trim().max(120).nullable().optional().default(null),
    youtube: z.string().trim().max(120).nullable().optional().default(null),
    tiktok: z.string().trim().max(120).nullable().optional().default(null),
    x: z.string().trim().max(120).nullable().optional().default(null),
});
export const publicProfileBusinessHourSchema = z.object({
    day: publicProfileDayIdSchema,
    open: z.string().trim().regex(/^\d{2}:\d{2}$/).nullable().optional().default(null),
    close: z.string().trim().regex(/^\d{2}:\d{2}$/).nullable().optional().default(null),
    closed: z.boolean().default(false),
});
export const publicProfileTeamSocialLinksSchema = z.object({
    instagram: z.string().trim().max(120).nullable().optional().default(null),
    facebook: z.string().trim().max(120).nullable().optional().default(null),
    linkedin: z.string().trim().max(120).nullable().optional().default(null),
});
export const publicProfileTeamMemberSchema = z.object({
    id: z.string().uuid().nullable().optional().default(null),
    name: z.string().trim().min(2).max(160),
    roleTitle: z.string().trim().max(120).nullable().optional().default(null),
    bio: z.string().trim().max(1200).nullable().optional().default(null),
    email: z.string().trim().email().max(255).nullable().optional().default(null),
    phone: z.string().trim().max(40).nullable().optional().default(null),
    whatsapp: z.string().trim().max(40).nullable().optional().default(null),
    avatarImageUrl: z.string().trim().max(500).nullable().optional().default(null),
    socialLinks: publicProfileTeamSocialLinksSchema.default({
        instagram: null,
        facebook: null,
        linkedin: null,
    }),
    specialties: z.array(z.string().trim().min(1).max(40)).max(6).default([]),
    isLeadContact: z.boolean().default(false),
    receivesLeads: z.boolean().default(true),
    isPublished: z.boolean().default(true),
});
export const publicProfileWriteSchema = z.object({
    slug: z.string().trim().min(3).max(80),
    isPublished: z.boolean().default(false),
    accountKind: publicProfileAccountKindSchema.default('individual'),
    leadRoutingMode: publicProfileLeadRoutingModeSchema.default('round_robin'),
    displayName: z.string().trim().min(2).max(160),
    headline: z.string().trim().max(180).nullable().optional().default(null),
    bio: z.string().trim().max(2400).nullable().optional().default(null),
    companyName: z.string().trim().max(160).nullable().optional().default(null),
    website: z.string().trim().max(500).nullable().optional().default(null),
    publicEmail: z.string().trim().email().max(255).nullable().optional().default(null),
    publicPhone: z.string().trim().max(40).nullable().optional().default(null),
    publicWhatsapp: z.string().trim().max(40).nullable().optional().default(null),
    addressLine: z.string().trim().max(255).nullable().optional().default(null),
    city: z.string().trim().max(120).nullable().optional().default(null),
    region: z.string().trim().max(120).nullable().optional().default(null),
    coverImageUrl: z.string().trim().max(500).nullable().optional().default(null),
    avatarImageUrl: z.string().trim().max(500).nullable().optional().default(null),
    socialLinks: publicProfileSocialLinksSchema.default({
        instagram: null,
        facebook: null,
        linkedin: null,
        youtube: null,
        tiktok: null,
        x: null,
    }),
    businessHours: z.array(publicProfileBusinessHourSchema).length(7),
    specialties: z.array(z.string().trim().min(1).max(40)).max(8).default([]),
    teamMembers: z.array(publicProfileTeamMemberSchema).max(12).default([]),
    scheduleNote: z.string().trim().max(255).nullable().optional().default(null),
    alwaysOpen: z.boolean().default(false),
});
