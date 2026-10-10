import os from "node:os";

const originalUserInfo = os.userInfo;

os.userInfo = (...args) => {
  try {
    return originalUserInfo(...args);
  } catch (error) {
    if (
      process.platform !== "win32" ||
      error?.code !== "ERR_SYSTEM_ERROR" ||
      !process.env.USERNAME
    ) {
      throw error;
    }

    return {
      uid: -1,
      gid: -1,
      username: process.env.USERNAME,
      homedir: process.env.USERPROFILE ?? "",
      shell: null,
    };
  }
};
