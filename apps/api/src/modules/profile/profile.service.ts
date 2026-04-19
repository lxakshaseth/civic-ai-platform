import { UserRole } from "@prisma/client";
import { StatusCodes } from "http-status-codes";

import { AppError } from "shared/errors/app-error";

import { CivicUserProfileRecord, ProfileRepository } from "./profile.repository";

type Actor = {
  email: string;
  role: UserRole;
};

type ProfileInput = {
  name?: string;
  phone?: string;
  language?: string;
  gender?: string;
  dateOfBirth?: string;
  permanentAddress?: string;
  pincode?: string;
  aadharNumber?: string;
  panNumber?: string;
  showSanitaryFeature?: boolean;
};

function normalizeOptionalText(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function normalizeProfile(record: CivicUserProfileRecord) {
  return {
    id: record.id,
    name: record.name ?? "",
    email: record.email ?? "",
    role: record.role ?? null,
    department: record.department ?? "",
    employee_code: record.employeeCode ?? "",
    category: record.category ?? "",
    status: record.status ?? "",
    phone: record.phone ?? "",
    language: record.language ?? "en",
    gender: record.gender ?? "",
    date_of_birth: record.dateOfBirth ?? "",
    permanent_address: record.permanentAddress ?? "",
    temporary_address: record.temporaryAddress ?? "",
    pincode: record.pincode ?? "",
    aadhar_number: record.aadharNumber ?? "",
    pan_number: record.panNumber ?? "",
    show_sanitary_feature: Boolean(record.showSanitaryFeature),
    profile_completed: Boolean(record.profileCompleted)
  };
}

function calculateProfileCompleted(input: {
  name?: string | null;
  email?: string | null;
    phone?: string | null;
    language?: string | null;
    gender?: string | null;
  dateOfBirth?: string | null;
  permanentAddress?: string | null;
  pincode?: string | null;
  aadharNumber?: string | null;
  panNumber?: string | null;
}) {
  return Boolean(
    normalizeOptionalText(input.name) &&
      normalizeOptionalText(input.email) &&
      normalizeOptionalText(input.phone) &&
      normalizeOptionalText(input.gender) &&
      normalizeOptionalText(input.dateOfBirth) &&
      normalizeOptionalText(input.permanentAddress) &&
      normalizeOptionalText(input.pincode) &&
      normalizeOptionalText(input.aadharNumber) &&
      normalizeOptionalText(input.panNumber)
  );
}

function isVerifiedFieldLocked(record: CivicUserProfileRecord) {
  return Boolean(normalizeOptionalText(record.aadharNumber) || normalizeOptionalText(record.panNumber));
}

export class ProfileService {
  constructor(private readonly profileRepository: ProfileRepository = new ProfileRepository()) {}

  async getProfile(actor: Actor) {
    const profile = await this.profileRepository.ensureAuthUserRow({
      email: actor.email,
      role: actor.role
    });

    return normalizeProfile(profile);
  }

  async createProfile(input: ProfileInput, actor: Actor) {
    const existingProfile = await this.profileRepository.ensureAuthUserRow({
      email: actor.email,
      name: input.name,
      role: actor.role,
      phone: input.phone,
      language: input.language
    });

    if (isVerifiedFieldLocked(existingProfile)) {
      throw new AppError(
        "Cannot update verified fields",
        StatusCodes.CONFLICT,
        "VERIFIED_FIELDS_LOCKED"
      );
    }

    return this.saveInitialProfile(existingProfile, input, actor);
  }

  async updateProfile(input: ProfileInput, actor: Actor) {
    const existingProfile = await this.profileRepository.ensureAuthUserRow({
      email: actor.email,
      name: input.name,
      role: actor.role,
      phone: input.phone,
      language: input.language
    });

    if (!isVerifiedFieldLocked(existingProfile) && !existingProfile.profileCompleted) {
      return this.saveInitialProfile(existingProfile, input, actor);
    }

    const attemptsVerifiedFieldChange =
      input.name !== undefined ||
      input.gender !== undefined ||
      input.dateOfBirth !== undefined ||
      input.aadharNumber !== undefined ||
      input.panNumber !== undefined;

    if (attemptsVerifiedFieldChange) {
      throw new AppError(
        "Cannot update verified fields",
        StatusCodes.CONFLICT,
        "VERIFIED_FIELDS_LOCKED"
      );
    }

    const updatedProfile = await this.profileRepository.updateProfileByEmail(actor.email, {
      phone: input.phone,
      language: input.language,
      permanentAddress: input.permanentAddress,
      pincode: input.pincode,
      showSanitaryFeature: input.showSanitaryFeature,
      profileCompleted: calculateProfileCompleted({
        name: existingProfile.name,
        email: existingProfile.email,
        phone: input.phone ?? existingProfile.phone,
        gender: existingProfile.gender,
        dateOfBirth: existingProfile.dateOfBirth,
        permanentAddress: input.permanentAddress ?? existingProfile.permanentAddress,
        pincode: input.pincode ?? existingProfile.pincode,
        aadharNumber: existingProfile.aadharNumber,
        panNumber: existingProfile.panNumber
      })
    });

    if (!updatedProfile) {
      throw new AppError("Profile not found", StatusCodes.NOT_FOUND, "PROFILE_NOT_FOUND");
    }

    return normalizeProfile(updatedProfile);
  }

  async syncAuthUserProfile(data: {
    email: string;
    name?: string | null;
    role?: UserRole;
    phone?: string | null;
    language?: string | null;
  }) {
    const profile = await this.profileRepository.ensureAuthUserRow(data);
    return normalizeProfile(profile);
  }

  private async saveInitialProfile(
    existingProfile: CivicUserProfileRecord,
    input: ProfileInput,
    actor: Actor
  ) {
    const normalizedAadhar = normalizeOptionalText(input.aadharNumber);
    const normalizedPan = normalizeOptionalText(input.panNumber)?.toUpperCase() ?? null;
    const hasConflict = await this.profileRepository.hasVerifiedFieldConflict({
      email: actor.email,
      aadharNumber: normalizedAadhar,
      panNumber: normalizedPan
    });

    if (hasConflict) {
      throw new AppError(
        "Cannot update verified fields",
        StatusCodes.CONFLICT,
        "VERIFIED_FIELDS_LOCKED"
      );
    }

    const savedProfile = await this.profileRepository.upsertProfileByEmail({
      email: actor.email,
      name: input.name ?? existingProfile.name,
      role: actor.role,
      phone: input.phone ?? existingProfile.phone,
      language: input.language ?? existingProfile.language,
      gender: input.gender ?? existingProfile.gender,
      dateOfBirth: input.dateOfBirth ?? existingProfile.dateOfBirth,
      permanentAddress: input.permanentAddress ?? existingProfile.permanentAddress,
      pincode: input.pincode ?? existingProfile.pincode,
      aadharNumber: normalizedAadhar ?? existingProfile.aadharNumber,
      panNumber: normalizedPan ?? existingProfile.panNumber,
      showSanitaryFeature: input.showSanitaryFeature ?? existingProfile.showSanitaryFeature,
      profileCompleted: calculateProfileCompleted({
        name: input.name ?? existingProfile.name,
        email: actor.email,
        phone: input.phone ?? existingProfile.phone,
        gender: input.gender ?? existingProfile.gender,
        dateOfBirth: input.dateOfBirth ?? existingProfile.dateOfBirth,
        permanentAddress: input.permanentAddress ?? existingProfile.permanentAddress,
        pincode: input.pincode ?? existingProfile.pincode,
        aadharNumber: normalizedAadhar ?? existingProfile.aadharNumber,
        panNumber: normalizedPan ?? existingProfile.panNumber
      })
    });

    return normalizeProfile(savedProfile);
  }
}
