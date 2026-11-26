const { User, UserSettings } = require("../models");
const { ApiError } = require("../utils/apiError");
const { signAccessToken } = require("../utils/jwt");

function getGoogleProfileData(profile) {
  const email = profile.emails?.[0]?.value?.toLowerCase();
  if (!profile.id || !email) {
    throw new ApiError(
      401,
      "Google did not return a usable identity",
      "GOOGLE_PROFILE_INVALID",
    );
  }

  return {
    googleId: profile.id,
    email,
    displayName: profile.displayName || email,
    avatarUrl: profile.photos?.[0]?.value || null,
    emailVerified: Boolean(profile.emails?.[0]?.verified),
  };
}

async function findOrCreateGoogleUser(profile) {
  const profileData = getGoogleProfileData(profile);
  let user = await User.findOne({ googleId: profileData.googleId });

  if (!user) {
    user = await User.findOne({ email: profileData.email });

    if (user && user.googleId && user.googleId !== profileData.googleId) {
      throw new ApiError(
        409,
        "This email is already linked to another account",
        "ACCOUNT_CONFLICT",
      );
    }
  }

  if (user) {
    user.googleId = profileData.googleId;
    user.displayName = profileData.displayName;
    user.avatarUrl = profileData.avatarUrl;
    user.emailVerified = profileData.emailVerified;
    user.lastLoginAt = new Date();
    await user.save();
  } else {
    user = await User.create({ ...profileData, lastLoginAt: new Date() });
  }

  await UserSettings.updateOne(
    { userId: user._id },
    { $setOnInsert: { userId: user._id } },
    { upsert: true, runValidators: true },
  );

  return user;
}

function createLoginToken(user) {
  return signAccessToken(user);
}

function getPublicUser(user) {
  return {
    id: user._id?.toString() || user.id || user.sub,
    email: user.email,
    displayName: user.displayName || null,
    avatarUrl: user.avatarUrl || null,
    role: user.role,
  };
}

module.exports = { createLoginToken, findOrCreateGoogleUser, getPublicUser };
