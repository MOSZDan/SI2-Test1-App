// services/ai.ts - VERSIÓN COMPLETA
import { http, API_PREFIX } from "./api";

export type AIDetectionResponse = {
  id: number;
  is_resident?: boolean;
  is_authorized?: boolean;
  user?: {
    codigo: number;
    nombre: string;
    correo: string;
  };
  plate?: string;
  confidence: number;
  timestamp: string;
  camera_location: string;
  status: string;
  image_url?: string;
};

export type AIStats = {
  facial_recognitions_today: number;
  plate_detections_today: number;
  residents_detected_today: number;
  unauthorized_plates_today: number;
  security_alerts_week: number;
  registered_faces: number;
};

export type FacialProfile = {
  id: number;
  user_id: number;
  user_name: string;
  user_email: string;
  image_url?: string;
  fecha_registro: string;
  activo: boolean;
};

export type RegisterResponse = {
  success: boolean;
  message?: string;
  error?: string;
  profile_id?: number;
  user?: {
    codigo: number;
    nombre: string;
    apellido: string;
    correo: string;
  };
  image_url?: string;
};

export type ListProfilesResponse = {
  success: boolean;
  profiles: FacialProfile[];
  count: number;
  error?: string;
};

export type DetectionResult = {
  id: number;
  image_url: string;
  detection_type: 'face' | 'plate';
  results: any;
  confidence: number;
  timestamp: string;
  user: string;
};

// Función utilitaria para convertir base64 a blob
function base64ToBlob(base64String: string): Blob {
  // Extraer solo la parte base64 (sin el prefijo data:image/jpeg;base64,)
  const base64Data = base64String.includes(',') ? base64String.split(',')[1] : base64String;

  // Convertir base64 a Uint8Array
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return new Blob([bytes], { type: 'image/jpeg' });
}

// Función utilitaria para hacer peticiones con FormData
async function aiRequest<T>(endpoint: string, token: string, imageBase64: string, extraFields: Record<string, string> = {}): Promise<T> {
  try {
    console.log(`🚀 Enviando petición a ${endpoint}...`);

    // Crear FormData
    const formData = new FormData();

    // Convertir imagen a blob y agregarla
    const imageBlob = base64ToBlob(imageBase64);
    formData.append('image', imageBlob, 'image.jpg');

    // Agregar campos adicionales
    Object.entries(extraFields).forEach(([key, value]) => {
      formData.append(key, value);
    });

    console.log('📊 FormData creado:', {
      imageSize: imageBlob.size,
      extraFields
    });

    const response = await fetch(`${API_PREFIX}/ai-detection/${endpoint}/`, {
      method: "POST",
      headers: {
        'Authorization': `Token ${token}`,
        // NO incluir Content-Type para FormData
      },
      body: formData
    });

    console.log('📡 Respuesta del servidor:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error del servidor:', errorText);
      throw new Error(`Error del servidor: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ Petición exitosa:', result);
    return result;
  } catch (error) {
    console.error(`❌ Error en ${endpoint}:`, error);
    throw error;
  }
}

export const aiAPI = {
  // RECONOCIMIENTO FACIAL
  recognizeFace(token: string, imageBase64: string, cameraLocation = "Web App") {
    return aiRequest<AIDetectionResponse>('recognize_face', token, imageBase64, {
      camera_location: cameraLocation
    });
  },

  // DETECCIÓN DE PLACAS
  detectPlate(token: string, imageBase64: string, cameraLocation = "Web App", accessType = "entrada") {
    return aiRequest<AIDetectionResponse>('detect_plate', token, imageBase64, {
      camera_location: cameraLocation,
      access_type: accessType
    });
  },

  // ESTADÍSTICAS (GET request, no necesita FormData)
  getStats(token: string) {
    return http<AIStats>(`${API_PREFIX}/ai-detection/detection_stats/`, { token });
  },

  // REGISTRO DE PERFIL FACIAL
  async registerCurrentUser(token: string, imageBase64: string): Promise<RegisterResponse> {
    return aiRequest<RegisterResponse>('register_current_user', token, imageBase64);
  },

  // REGISTRO DE PERFIL PARA OTRO USUARIO
  registerProfile(token: string, userId: number, imageBase64: string) {
    return aiRequest<RegisterResponse>('register_profile', token, imageBase64, {
      user_id: userId.toString()
    });
  },

  // REGISTRO CON ARCHIVO DIRECTO
  async registerProfileFile(token: string, userId: number, file: File): Promise<RegisterResponse> {
    try {
      const formData = new FormData();
      formData.append('user_id', userId.toString());
      formData.append('image', file);

      const response = await fetch(`${API_PREFIX}/ai-detection/register_profile/`, {
        method: "POST",
        headers: {
          'Authorization': `Token ${token}`,
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Error registrando perfil facial');
      }

      return await response.json();
    } catch (error) {
      console.error('Error en registerProfileFile:', error);
      throw error;
    }
  },

  // LISTAR PERFILES (GET request, no necesita FormData)
  listProfiles(token: string) {
    return http<ListProfilesResponse>(`${API_PREFIX}/ai-detection/list_profiles/`, {
      method: "GET",
      token
    });
  },

  // ELIMINAR PERFIL (DELETE request, no necesita FormData)
  deleteProfile(token: string, profileId: number) {
    return http<{success: boolean; message: string}>(`${API_PREFIX}/ai-detection/${profileId}/delete_profile/`, {
      method: "DELETE",
      token
    });
  },

  // Utilidad para convertir File a base64
  fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },

  // NUEVAS FUNCIONES DE DETECCIÓN
  uploadImageForDetection(token: string, file: File, tipo: 'face' | 'plate' = 'face'): Promise<DetectionResult> {
    return new Promise(async (resolve, reject) => {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('detection_type', tipo);

      try {
        const response = await fetch(`${API_PREFIX}/ai-detection/`, {
          method: 'POST',
          headers: {
            Authorization: `Token ${token}`,
          },
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          return reject(new Error(errorData.detail || 'Error en la detección'));
        }

        const result = await response.json();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  },

  getDetectionHistory(token: string): Promise<DetectionResult[]> {
    return http<any>(`${API_PREFIX}/ai-detection/history/`, { token })
      .then(data => Array.isArray(data) ? data : data.results || []);
  },

  deleteDetection(token: string, id: number): Promise<void> {
    return http<void>(`${API_PREFIX}/ai-detection/${id}/`, { method: "DELETE", token });
  },

  getDetectionStats(token: string) {
    return http<any>(`${API_PREFIX}/ai-detection/stats/`, { token });
  }
};