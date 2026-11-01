import { Upload } from "tus-js-client";
import {
  supabase,
  supabaseConfigError,
} from "./supabase";
import { newestFirst } from "./listOrder";

export const cloudEnabled =
  process.env.REACT_APP_DATA_MODE !== "demo";

export async function api(action, payload = {}) {
  if (!supabase) {
    throw Error(supabaseConfigError);
  }

  const { data, error } =
    await supabase.functions.invoke("academy", {
      body: {
        ...payload,
        action,
      },
    });

  if (error) {
    let message = error.message;

    try {
      const result = await error.context.json();
      message = result.error || message;
    } catch {
      // Asl xabar saqlanadi.
    }

    throw Error(message);
  }

  if (data?.error) {
    throw Error(data.error);
  }

  // Xodimlar alohida API orqali olinadi.
  if (
    action === "staffOverview" &&
    Array.isArray(data?.staff)
  ) {
    return {
      ...data,
      staff: newestFirst(data.staff),
    };
  }

  return data;
}

function compactJwt(value) {
  return (
    typeof value === "string" &&
    /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(
      value
    )
  );
}

async function accessToken() {
  if (!supabase) {
    throw Error(supabaseConfigError);
  }

  const { data, error } =
    await supabase.auth.getSession();

  if (error) throw error;

  const token = data.session?.access_token;

  if (!compactJwt(token)) {
    throw Error(
      "Sessiya topilmadi. Hisobdan chiqib, qayta kiring."
    );
  }

  return token;
}

export async function uploadCloudFile(
  file,
  onProgress
) {
  const extension = file.name
    .split(".")
    .pop()
    .toLowerCase();

  const types = {
    mp4: "video/mp4",
    webm: "video/webm",
    pdf: "application/pdf",
    xls: "application/vnd.ms-excel",
    xlsx:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
  };

  const mime =
    types[extension] ||
    file.type ||
    "application/octet-stream";

  const video = mime.startsWith("video/");

  if (!video && file.size > 20 * 1024 * 1024) {
    throw Error("Fayl 20 MB dan oshmasin.");
  }

  const {
    path,
    token,
    bucket,
    endpoint,
  } = await api("upload", {
    name: file.name,
    type: mime,
    size: file.size,
  });

  if (
    !compactJwt(token) ||
    !path ||
    !bucket ||
    typeof endpoint !== "string" ||
    !endpoint
  ) {
    throw Error(
      "Yuklash ruxsati noto‘g‘ri. academy Edge Function kodini yangilab deploy qiling."
    );
  }

  const access = await accessToken();

  const signedEndpoint = endpoint.replace(
    /\/resumable\/?$/,
    "/resumable/sign"
  );

  await new Promise((resolve, reject) => {
    const upload = new Upload(file, {
      endpoint: signedEndpoint,

      headers: {
        Authorization: "Bearer " + access,
        "x-signature": token,
      },

      async onBeforeRequest(request) {
        request.setHeader(
          "Authorization",
          "Bearer " + await accessToken()
        );
      },

      retryDelays: [0, 1000, 3000, 5000, 10000],
      chunkSize: 6 * 1024 * 1024,
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,

      metadata: {
        bucketName: bucket,
        objectName: path,
        contentType: mime,
        cacheControl: "3600",
      },

      onProgress(sent, total) {
        if (total > 0) {
          onProgress?.(
            Math.round((sent / total) * 100)
          );
        }
      },

      onError(error) {
        reject(
          Error(
            "Yuklash amalga oshmadi: " +
            error.message
          )
        );
      },

      onSuccess() {
        resolve();
      },
    });

    upload.start();
  });

  return path;
}

export async function mediaUrl(path) {
  const result = await api("media", { path });

  if (
    typeof result?.url !== "string" ||
    !result.url
  ) {
    throw Error("Fayl havolasi olinmadi.");
  }

  return result.url;
}

export async function cloudFile(path) {
  const result = await fetch(await mediaUrl(path));

  if (!result.ok) {
    throw Error("Fayl yuklanmadi.");
  }

  return result.blob();
}