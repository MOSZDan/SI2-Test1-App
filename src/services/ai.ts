// Servicio de IA - Comunicación directa con microservicio
import { AI_SERVICE_BASE, AI_API_PREFIX } from './api';

// ========= TIPOS ESPECÍFICOS PARA IA =========

export interface AIDetectionResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

export interface FacialRecognitionResult extends AIDetectionResult {
  data?: {
    id: number;
    user_id?: number;
    user_name?: string;
    confidence: number;
    is_resident: boolean;
    image_url?: string;
    detection_time: string;
    camera_location: string;
  };
}

export interface PlateDetectionResult extends AIDetectionResult {
  data?: {
    id: number;
    plate: string;
    confidence: number;
    is_authorized: boolean;
    vehicle_info?: any;
    image_url?: string;
    detection_time: string;
    camera_location: string;
  };
}

export interface ProfileRegistrationResult extends AIDetectionResult {
  data?: {
    profile_id: number;
    user_id: number;
    user_name: string;
    image_url: string;
    registration_time: string;
  };
}

// ========= FUNCIÓN HTTP PARA IA =========

async function aiHttp<T>(
  url: string,
  options: {
    method?: string;
    token?: string;
    body?: string | FormData;
    headers?: Record<string, string>;
  } = {}
): Promise<T> {
  const { method = "GET", token, body, headers = {} } = options;

  const config: RequestInit = {
    method,
    headers: {
      ...headers,
    },
  };

  // Solo agregar Content-Type si no es FormData
  if (!(body instanceof FormData)) {
    config.headers = {
      "Content-Type": "application/json",
      ...config.headers,
    };
  }

  if (token) {
    config.headers = {
      ...config.headers,
      Authorization: `Token ${token}`,
    };
  }

  if (body && method !== "GET") {
    config.body = body;
  }

  try {
    const response = await fetch(url, config);

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;

      try {
        const errorData = await response.json();
        if (errorData.error) {
          errorMessage = errorData.error;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.detail) {
          errorMessage = errorData.detail;
        }
      } catch {
        // Si no se puede parsear el JSON de error, usar el mensaje por defecto
      }

      throw new Error(errorMessage);
    }

    // Manejar respuestas vacías
    if (response.status === 204) {
      return {} as T;
    }

    return await response.json();
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Error de conexión con el servicio de IA");
  }
}

// ========= API DE RECONOCIMIENTO FACIAL =========

export const facialRecognitionAPI = {
  /**
   * Reconocer rostro en una imagen
   */
  async recognize(token: string, file: File, cameraLocation = "Web App"): Promise<FacialRecognitionResult> {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('camera_location', cameraLocation);

    return aiHttp<FacialRecognitionResult>(`${AI_API_PREFIX}/facial/recognize`, {
      method: 'POST',
      token,
      body: formData,
    });
  },

  /**
   * Registrar un nuevo perfil facial
   */
  async registerProfile(token: string, file: File, userId: number): Promise<ProfileRegistrationResult> {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('user_id', userId.toString());

    return aiHttp<ProfileRegistrationResult>(`${AI_API_PREFIX}/facial/register`, {
      method: 'POST',
      token,
      body: formData,
    });
  },

  /**
   * Obtener lista de perfiles registrados
   */
  async listProfiles(token: string): Promise<AIDetectionResult> {
    return aiHttp<AIDetectionResult>(`${AI_API_PREFIX}/facial/profiles`, {
      token,
    });
  },

  /**
   * Eliminar un perfil facial
   */
  async deleteProfile(token: string, profileId: number): Promise<AIDetectionResult> {
    return aiHttp<AIDetectionResult>(`${AI_API_PREFIX}/facial/profiles/${profileId}`, {
      method: 'DELETE',
      token,
    });
  },

  /**
   * Obtener estadísticas de reconocimiento facial
   */
  async getStats(token: string): Promise<AIDetectionResult> {
    return aiHttp<AIDetectionResult>(`${AI_API_PREFIX}/facial/stats`, {
      token,
    });
  }
};

// ========= API DE DETECCIÓN DE PLACAS =========

export const plateDetectionAPI = {
  /**
   * Detectar placa en una imagen
   */
  async detect(token: string, file: File, cameraLocation = "Estacionamiento", accessType = "entrada"): Promise<PlateDetectionResult> {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('camera_location', cameraLocation);
    formData.append('access_type', accessType);

    return aiHttp<PlateDetectionResult>(`${AI_API_PREFIX}/plates/detect`, {
      method: 'POST',
      token,
      body: formData,
    });
  },

  /**
   * Obtener lista de detecciones
   */
  async listDetections(token: string): Promise<AIDetectionResult> {
    return aiHttp<AIDetectionResult>(`${AI_API_PREFIX}/plates/detections`, {
      token,
    });
  },

  /**
   * Obtener estadísticas de detección de placas
   */
  async getStats(token: string): Promise<AIDetectionResult> {
    return aiHttp<AIDetectionResult>(`${AI_API_PREFIX}/plates/stats`, {
      token,
    });
  }
};

// ========= API DE ESTADÍSTICAS GENERALES =========

export const aiStatsAPI = {
  /**
   * Obtener estadísticas generales del sistema de IA
   */
  async getGeneral(token: string): Promise<AIDetectionResult> {
    return aiHttp<AIDetectionResult>(`${AI_API_PREFIX}/stats/general`, {
      token,
    });
  },

  /**
   * Obtener estadísticas de las últimas 24 horas
   */
  async getToday(token: string): Promise<AIDetectionResult> {
    return aiHttp<AIDetectionResult>(`${AI_API_PREFIX}/stats/today`, {
      token,
    });
  },

  /**
   * Obtener estadísticas de la última semana
   */
  async getWeek(token: string): Promise<AIDetectionResult> {
    return aiHttp<AIDetectionResult>(`${AI_API_PREFIX}/stats/week`, {
      token,
    });
  }
};

// ========= API DE SALUD DEL SERVICIO =========

export const aiHealthAPI = {
  /**
   * Verificar estado del servicio de IA
   */
  async check(): Promise<{ status: string; timestamp: string; services: Record<string, boolean> }> {
    try {
      return await aiHttp<{ status: string; timestamp: string; services: Record<string, boolean> }>(`${AI_SERVICE_BASE}/health`);
    } catch (error) {
      throw new Error(`Servicio de IA no disponible: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  },

  /**
   * Obtener información del servicio
   */
  async info(): Promise<{ version: string; models: string[]; capabilities: string[] }> {
    return aiHttp<{ version: string; models: string[]; capabilities: string[] }>(`${AI_SERVICE_BASE}/info`);
  }
};

// ========= UTILIDADES =========

/**
 * Verificar si el servicio de IA está disponible
 */
export async function checkAIServiceAvailable(): Promise<boolean> {
  try {
    await aiHealthAPI.check();
    return true;
  } catch {
    return false;
  }
}

/**
 * Validar archivo de imagen antes de enviarlo
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  // Verificar tipo
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Tipo de archivo no válido. Solo se permiten: JPEG, PNG, WebP'
    };
  }

  // Verificar tamaño (máximo 5MB)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'El archivo es demasiado grande. Máximo 5MB.'
    };
  }

  return { valid: true };
}

/**
 * Redimensionar imagen si es necesario (usando Canvas)
 */
export function resizeImage(file: File, maxWidth = 1920, maxHeight = 1080, quality = 0.8): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('No se pudo crear el contexto del canvas'));
      return;
    }

    img.onload = () => {
      // Calcular nuevas dimensiones manteniendo proporción
      let { width, height } = img;

      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      if (height > maxHeight) {
        width = (width * maxHeight) / height;
        height = maxHeight;
      }

      // Configurar canvas
      canvas.width = width;
      canvas.height = height;

      // Dibujar imagen redimensionada
      ctx.drawImage(img, 0, 0, width, height);

      // Convertir a blob y luego a File
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const resizedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now(),
            });
            resolve(resizedFile);
          } else {
            reject(new Error('Error al procesar la imagen'));
          }
        },
        file.type,
        quality
      );
    };

    img.onerror = () => reject(new Error('Error al cargar la imagen'));
    img.src = URL.createObjectURL(file);
  });
}

// ========= EXPORTACIONES =========

export default {
  facial: facialRecognitionAPI,
  plates: plateDetectionAPI,
  stats: aiStatsAPI,
  health: aiHealthAPI,
  utils: {
    checkAvailable: checkAIServiceAvailable,
    validateImage: validateImageFile,
    resizeImage,
  }
};
