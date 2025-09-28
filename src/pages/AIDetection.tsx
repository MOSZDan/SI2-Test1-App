// pages/AIDetection.tsx - VERSIÓN CON DEBUGGING Y LOGGING DETALLADO
import { useState, useRef, useCallback, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import {
  facialRecognitionAPI,
  plateDetectionAPI,
  validateImageFile,
  resizeImage
} from "../services/ai";
import Navbar from "../components/Navbar";

// Tipo para perfiles faciales
type FacialProfile = {
  id: number;
  user_id: number;
  user_name: string;
  user_email?: string;
  image_url: string;
  registration_time: string;
  fecha_registro?: string;
};

type TabType = "recognition" | "registration" | "profiles";
// Definimos un tipo explícito para los estados de cámara
type CameraStatus = 'stopped' | 'starting' | 'running' | 'error';

export default function AIDetection() {
  const { token, user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados principales
  const [activeTab, setActiveTab] = useState<TabType>("recognition");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [result, setResult] = useState<string>("Esperando...");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Estados para registro
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [profiles, setProfiles] = useState<FacialProfile[]>([]);
  const [registering, setRegistering] = useState(false);

  // Estado adicional para mejor control de la cámara
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>('stopped');

  // Variable booleana para simplificar comparaciones
  const isStartingCamera = cameraStatus === 'starting';

  // Función de logging detallado
  const log = useCallback((message: string, data?: unknown) => {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    console.log(`[${timestamp}] AIDetection: ${message}`, data || '');
  }, []);

  // Función para verificar estado del video
  const checkVideoState = useCallback(() => {
    const video = videoRef.current;
    if (!video) {
      log("❌ checkVideoState: video element no disponible");
      return false;
    }

    log("🔍 Estado del video:", {
      readyState: video.readyState,
      videoWidth: video.videoWidth,
      videoHeight: video.videoHeight,
      paused: video.paused,
      srcObject: !!video.srcObject,
      currentTime: video.currentTime
    });

    return video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0;
  }, [log]);

  const startCamera = useCallback(async () => {
    try {
      log("🚀 Iniciando cámara...");
      setCameraStatus('starting');
      setError(null);
      setResult("Iniciando cámara...");

      // Verificar soporte del navegador
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Tu navegador no soporta acceso a la cámara');
      }

      log("✅ MediaDevices API disponible");

      // Detener stream anterior si existe
      if (stream) {
        log("🛑 Deteniendo stream anterior");
        stream.getTracks().forEach(track => track.stop());
      }

      // Solicitar permisos con configuración optimizada
      const constraints = {
        video: {
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 },
          facingMode: 'user',
          frameRate: { ideal: 30, min: 15 }
        },
        audio: false
      };

      log("📹 Solicitando acceso a cámara con constraints:", constraints);
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      log("✅ Stream obtenido:", {
        id: mediaStream.id,
        active: mediaStream.active,
        tracks: mediaStream.getTracks().length
      });

      if (videoRef.current) {
        log("🎥 Asignando stream al elemento video");
        videoRef.current.srcObject = mediaStream;

        // Esperar a que el video esté listo
        await new Promise<void>((resolve, reject) => {
          if (!videoRef.current) {
            reject(new Error('Video element not available'));
            return;
          }

          const video = videoRef.current;

          const handleLoadedMetadata = () => {
            log("✅ Video metadata cargada");
            video.removeEventListener('loadedmetadata', handleLoadedMetadata);
            video.removeEventListener('error', handleError);
            checkVideoState();
            resolve();
          };

          const handleError = (e: Event) => {
            log("❌ Error en video element:", e);
            video.removeEventListener('loadedmetadata', handleLoadedMetadata);
            video.removeEventListener('error', handleError);
            reject(new Error('Error loading video metadata'));
          };

          video.addEventListener('loadedmetadata', handleLoadedMetadata);
          video.addEventListener('error', handleError);

          // Intentar reproducir el video
          log("▶️ Iniciando reproducción del video");
          video.play().then(() => {
            log("✅ Video reproduciéndose");
          }).catch((playError) => {
            log("❌ Error reproduciendo video:", playError);
            reject(playError);
          });
        });
      }

      setStream(mediaStream);
      setCameraStatus('running');
      setResult("Cámara iniciada correctamente - Lista para usar");
      log("🎉 Cámara iniciada exitosamente");

    } catch (err: unknown) {
      log("❌ Error iniciando cámara:", err);
      setCameraStatus('error');

      let errorMessage = 'Error desconocido al acceder a la cámara';

      if (err instanceof Error) {
        log("📝 Detalles del error:", {
          name: err.name,
          message: err.message,
          stack: err.stack?.split('\n').slice(0, 3)
        });

        if (err.name === 'NotAllowedError') {
          errorMessage = 'Permisos de cámara denegados. Habilita el acceso en tu navegador.';
        } else if (err.name === 'NotFoundError') {
          errorMessage = 'No se encontró ninguna cámara conectada.';
        } else if (err.name === 'NotReadableError') {
          errorMessage = 'La cámara está siendo usada por otra aplicación.';
        } else if (err.name === 'OverconstrainedError') {
          errorMessage = 'La configuración solicitada no es compatible con tu cámara.';
        } else if (err.message) {
          errorMessage = err.message;
        }
      }

      setError(errorMessage);
      setResult(`Error: ${errorMessage}`);
    }
  }, [stream, log, checkVideoState]);

  const stopCamera = useCallback(() => {
    log("🛑 Deteniendo cámara");
    if (stream) {
      log("🔄 Deteniendo tracks del stream");
      stream.getTracks().forEach(track => {
        log(`⏹️ Deteniendo track: ${track.kind} - ${track.label}`);
        track.stop();
      });
      setStream(null);
    }

    if (videoRef.current) {
      log("🎥 Limpiando srcObject del video");
      videoRef.current.srcObject = null;
    }

    setCameraStatus('stopped');
    setResult("Cámara detenida");
    log("✅ Cámara detenida completamente");
  }, [stream, log]);

  // Función mejorada para capturar imagen con logging y canvas dinámico
  const captureImage = useCallback((): string => {
    log("📸 Iniciando captura de imagen");

    const video = videoRef.current;

    if (!video) {
      log("❌ Video element no disponible");
      throw new Error('Video element no disponible');
    }

    log("🔍 Verificando estado del video para captura");
    const videoState = checkVideoState();

    if (!videoState) {
      log("❌ Video no está en estado válido para captura");
      throw new Error('El video no está listo para capturar');
    }

    // Crear canvas dinámicamente si no existe o no está disponible
    let canvas = canvasRef.current;
    if (!canvas) {
      log("⚠️ Canvas ref no disponible, creando canvas dinámico");
      canvas = document.createElement('canvas');
    }

    // Configurar canvas
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    log(`📐 Canvas configurado: ${canvas.width}x${canvas.height}`);

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      log("❌ No se pudo obtener contexto 2D del canvas");
      throw new Error('No se pudo obtener el contexto del canvas');
    }

    // Limpiar y dibujar
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(video, 0, 0);
    log("✅ Imagen dibujada en canvas");

    // Convertir a base64
    const dataURL = canvas.toDataURL('image/jpeg', 0.9);
    log(`📊 Imagen generada: ${dataURL.length} caracteres`);

    if (!dataURL || dataURL === 'data:,' || dataURL.length < 1000) {
      log("❌ Imagen generada inválida o muy pequeña");
      throw new Error('Error generando la imagen');
    }

    log("✅ Imagen capturada exitosamente");
    return dataURL;
  }, [log, checkVideoState]);

  // Función de captura con logging detallado
  const capturePhoto = useCallback(() => {
    log("📸 capturePhoto llamada");

    if (cameraStatus !== 'running') {
      log(`❌ Cámara no está corriendo. Estado actual: ${cameraStatus}`);
      setError("Primero debes iniciar la cámara");
      return;
    }

    try {
      log("🎯 Intentando capturar imagen");
      const imageData = captureImage();
      setCapturedImage(imageData);
      setResult("Foto capturada correctamente - Lista para usar");
      setError(null);
      setMessage("Imagen capturada exitosamente");
      log("🎉 Captura exitosa");
    } catch (err: unknown) {
      let errorMessage = 'Error capturando imagen';
      if (err instanceof Error) {
        errorMessage = err.message;
        log("❌ Error en captura:", err);
      }
      setError(errorMessage);
    }
  }, [cameraStatus, captureImage, log]);

  // Efecto para manejar cambios de pestaña
  useEffect(() => {
    log(`🔄 Cambio de pestaña a: ${activeTab}`);

    // Si tenemos stream y cambiamos a una pestaña que necesita video
    if (stream && (activeTab === 'recognition' || activeTab === 'registration')) {
      log("🎥 Pestaña requiere video, reconectando...");

      if (videoRef.current) {
        log("🔗 Reasignando stream al video element");
        videoRef.current.srcObject = stream;

        // Forzar reproducción después de cambiar de pestaña
        videoRef.current.play().catch(err => {
          log("❌ Error reproduciendo video después de cambio de pestaña:", err);
          setError("Error reiniciando video: " + err.message);
        });
      }
    }

    // Limpiar resultados al cambiar de pestaña
    setError(null);
    setMessage(null);
    setResult("Esperando...");

    // Cargar perfiles solo cuando cambiamos a esa pestaña
    if (activeTab === "profiles" && token) {
      loadProfiles();
    }
  }, [activeTab, stream, log, token]);

  // Limpiar recursos al desmontar
  useEffect(() => {
    return () => {
      log("♻️ Limpiando recursos al desmontar componente");
      if (stream) {
        log("🛑 Deteniendo tracks del stream");
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream, log]);

  // Cargar perfiles registrados
  const loadProfiles = async () => {
    if (!token) {
      log("❌ No hay token para cargar perfiles");
      return;
    }

    try {
      log("🔄 Cargando perfiles faciales...");
      setLoading(true);
      const response = await facialRecognitionAPI.listProfiles(token);

      if (response.success && response.data) {
        log(`✅ Perfiles cargados: ${(response.data as { profiles?: FacialProfile[] }).profiles?.length || 0}`);
        setProfiles((response.data as { profiles?: FacialProfile[] }).profiles || []);
      } else {
        log("❌ Error cargando perfiles:", response.error);
        setError(response.error || "Error cargando perfiles");
      }
    } catch (err) {
      log("❌ Excepción cargando perfiles:", err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Error desconocido cargando perfiles");
      }
    } finally {
      setLoading(false);
    }
  };

  // Función para reconocimiento facial
  const recognizeFace = async () => {
    if (!capturedImage) {
      setError("Primero debes capturar una imagen");
      return;
    }

    if (!token) {
      setError("No hay sesión activa");
      return;
    }

    try {
      log("🔄 Iniciando reconocimiento facial...");
      setLoading(true);
      setError(null);
      setResult("Procesando reconocimiento facial...");

      // Convertir base64 a File
      const file = await base64ToFile(capturedImage, "captured-image.jpg");
      const response = await facialRecognitionAPI.recognize(token, file, "Web App");
      log("✅ Respuesta del reconocimiento:", response);

      let resultText = "";

      if (response.success && response.data) {
        if (response.data.is_resident && response.data.user_name) {
          resultText = `¡Persona identificada! ${response.data.user_name} - Confianza: ${(response.data.confidence * 100).toFixed(2)}%`;
        } else {
          resultText = "Persona no reconocida en el sistema";
        }
      } else {
        resultText = response.message || "Error en el reconocimiento";
      }

      setResult(resultText);
    } catch (err) {
      log("❌ Error en reconocimiento:", err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Error en el reconocimiento facial");
      }
      setResult("Error en el proceso de reconocimiento");
    } finally {
      setLoading(false);
    }
  };

  // Función para detección de placas
  const detectPlate = async () => {
    if (!capturedImage) {
      setError("Primero debes capturar una imagen");
      return;
    }

    if (!token) {
      setError("No hay sesión activa");
      return;
    }

    try {
      log("🔄 Iniciando detección de placa...");
      setLoading(true);
      setError(null);
      setResult("Procesando detección de placa...");

      // Convertir base64 a File
      const file = await base64ToFile(capturedImage, "captured-image.jpg");
      const response = await plateDetectionAPI.detect(token, file, "Web App", "entrada");
      log("✅ Respuesta de la detección de placa:", response);

      let resultText = "";

      if (response.success && response.data) {
        if (response.data.plate) {
          resultText = `Placa detectada: ${response.data.plate} - Confianza: ${(response.data.confidence * 100).toFixed(2)}%`;
          if (response.data.is_authorized === true) {
            resultText += " - Autorizada ✅";
          } else if (response.data.is_authorized === false) {
            resultText += " - No autorizada ❌";
          }
        } else {
          resultText = "No se detectó ninguna placa en la imagen";
        }
      } else {
        resultText = response.message || "Error en la detección";
      }

      setResult(resultText);
    } catch (err) {
      log("❌ Error en detección de placa:", err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Error en la detección de placa");
      }
      setResult("Error en el proceso de detección");
    } finally {
      setLoading(false);
    }
  };

  // Función para registrar rostro del usuario actual
  const registerFace = async () => {
    if (!capturedImage) {
      setError("Primero debes capturar una imagen");
      return;
    }

    if (!token || !user) {
      setError("No hay sesión activa o información de usuario");
      return;
    }

    try {
      log("🔄 Iniciando registro facial...");
      setRegistering(true);
      setError(null);
      setResult("Procesando registro facial...");

      // Convertir base64 a File
      const file = await base64ToFile(capturedImage, "face-registration.jpg");
      const response = await facialRecognitionAPI.registerProfile(token, file, user.codigo);
      log("✅ Respuesta del registro:", response);

      if (response.success) {
        setMessage(response.message || "Registro facial exitoso");
        setResult("Perfil facial registrado correctamente");
      } else {
        setError(response.error || "Error en el registro");
        setResult("Error en el registro facial");
      }
    } catch (err) {
      log("❌ Error en registro facial:", err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Error en el registro facial");
      }
      setResult("Error en el proceso de registro");
    } finally {
      setRegistering(false);
    }
  };

  // Función para registrar con archivo
  const registerWithFile = async () => {
    if (!selectedFile) {
      setError("Primero debes seleccionar un archivo");
      return;
    }

    if (!token || !user) {
      setError("No hay sesión activa o información de usuario");
      return;
    }

    // Validar el archivo
    const validation = validateImageFile(selectedFile);
    if (!validation.valid) {
      setError(validation.error || "Archivo no válido");
      return;
    }

    try {
      log("🔄 Iniciando registro facial con archivo...");
      setRegistering(true);
      setError(null);
      setResult("Procesando registro facial...");

      // Redimensionar si es necesario
      const processedFile = selectedFile.size > 2 * 1024 * 1024
        ? await resizeImage(selectedFile, 1920, 1080, 0.8)
        : selectedFile;

      const response = await facialRecognitionAPI.registerProfile(token, processedFile, user.codigo);
      log("✅ Respuesta del registro con archivo:", response);

      if (response.success) {
        setMessage(response.message || "Registro facial exitoso");
        setResult("Perfil facial registrado correctamente");
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      } else {
        setError(response.error || "Error en el registro");
        setResult("Error en el registro facial");
      }
    } catch (err) {
      log("❌ Error en registro facial con archivo:", err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Error en el registro facial");
      }
      setResult("Error en el proceso de registro");
    } finally {
      setRegistering(false);
    }
  };

  // Función para eliminar perfil
  const deleteProfile = async (profileId: number) => {
    if (!token) {
      setError("No hay sesión activa");
      return;
    }

    if (!confirm("¿Está seguro de eliminar este perfil facial?")) {
      return;
    }

    try {
      log(`🔄 Eliminando perfil facial ID: ${profileId}...`);
      setLoading(true);

      const response = await facialRecognitionAPI.deleteProfile(token, profileId);
      log("✅ Respuesta de eliminación:", response);

      if (response.success) {
        setMessage(response.message || "Perfil eliminado correctamente");
        // Recargar perfiles
        await loadProfiles();
      } else {
        setError(response.error || "Error al eliminar el perfil");
      }

    } catch (err) {
      log("❌ Error eliminando perfil:", err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Error al eliminar el perfil");
      }
    } finally {
      setLoading(false);
    }
  };

  // Función auxiliar para convertir base64 a File
  const base64ToFile = async (base64: string, filename: string): Promise<File> => {
    const response = await fetch(base64);
    const blob = await response.blob();
    return new File([blob], filename, { type: 'image/jpeg' });
  };

  // Función para subir archivo directamente
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      setSelectedFile(files[0]);
      setCapturedImage(null); // Limpiar imagen capturada si hay
      setResult(`Archivo seleccionado: ${files[0].name}`);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Navbar />

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Sistema de Detección con IA</h1>

        {/* Tabs de navegación */}
        <div className="border-b border-gray-200 mb-6">
          <div className="flex -mb-px space-x-8">
            <button
              className={`py-2 px-1 border-b-2 ${
                activeTab === "recognition"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent hover:text-gray-700 hover:border-gray-300"
              }`}
              onClick={() => setActiveTab("recognition")}
            >
              Reconocimiento
            </button>
            <button
              className={`py-2 px-1 border-b-2 ${
                activeTab === "registration"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent hover:text-gray-700 hover:border-gray-300"
              }`}
              onClick={() => setActiveTab("registration")}
            >
              Registro
            </button>
            <button
              className={`py-2 px-1 border-b-2 ${
                activeTab === "profiles"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent hover:text-gray-700 hover:border-gray-300"
              }`}
              onClick={() => setActiveTab("profiles")}
            >
              Perfiles
            </button>
          </div>
        </div>

        {/* Mensajes de feedback */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
            <strong>Error:</strong> {error}
          </div>
        )}

        {message && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700">
            <strong>✅</strong> {message}
            <button onClick={() => setMessage(null)} className="ml-2 font-bold">×</button>
          </div>
        )}

        {/* Controles de cámara - Comunes a reconocimiento y registro */}
        {(activeTab === "recognition" || activeTab === "registration") && (
          <div className="mb-6">
            <div className="flex flex-wrap gap-4 mb-4">
              <button
                onClick={startCamera}
                disabled={isStartingCamera || cameraStatus === 'running'}
                className={`px-4 py-2 rounded ${
                  isStartingCamera || cameraStatus === 'running'
                    ? "bg-gray-300 cursor-not-allowed"
                    : "bg-blue-500 hover:bg-blue-600 text-white"
                }`}
              >
                {isStartingCamera ? "Iniciando cámara..." : (cameraStatus === 'running' ? "Cámara activa" : "Iniciar cámara")}
              </button>
              <button
                onClick={stopCamera}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded"
                disabled={cameraStatus === 'stopped'}
              >
                Detener cámara
              </button>

              <button
                onClick={capturePhoto}
                disabled={cameraStatus !== 'running'}
                className={`px-4 py-2 rounded ${
                  cameraStatus !== 'running'
                    ? "bg-gray-300 cursor-not-allowed"
                    : "bg-green-500 hover:bg-green-600 text-white"
                }`}
              >
                Capturar foto
              </button>
            </div>

            <div className="mb-4">
              {isStartingCamera ? (
                <p className="text-yellow-600">Iniciando cámara, espere por favor...</p>
              ) : (
                <p className="text-gray-500">Estado: {cameraStatus}</p>
              )}
              <p className="text-gray-700">{result}</p>
            </div>
          </div>
        )}

        {/* Contenedor de video y canvas */}
        {(activeTab === "recognition" || activeTab === "registration") && (
          <div className="flex flex-col md:flex-row gap-6">
            <div className="w-full md:w-1/2">
              <h2 className="text-lg font-semibold mb-2">Cámara</h2>
              <div className="bg-black rounded-xl overflow-hidden aspect-video relative">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
                {cameraStatus === 'stopped' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-900/70 text-white">
                    Cámara no iniciada
                  </div>
                )}
              </div>
              <canvas ref={canvasRef} className="hidden" />
            </div>

            <div className="w-full md:w-1/2">
              <h2 className="text-lg font-semibold mb-2">Imagen capturada</h2>
              <div className="bg-gray-100 rounded-xl overflow-hidden aspect-video flex items-center justify-center">
                {capturedImage ? (
                  <img
                    src={capturedImage}
                    alt="Imagen capturada"
                    className="max-w-full max-h-full object-contain"
                  />
                ) : (
                  <p className="text-gray-500">No hay imagen capturada</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Controles específicos de reconocimiento */}
        {activeTab === "recognition" && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h2 className="text-xl font-semibold mb-4">Acciones de reconocimiento</h2>

            <div className="flex flex-wrap gap-4">
              <button
                onClick={recognizeFace}
                disabled={!capturedImage || loading}
                className={`px-4 py-2 rounded ${
                  !capturedImage || loading
                    ? "bg-gray-300 cursor-not-allowed"
                    : "bg-blue-500 hover:bg-blue-600 text-white"
                }`}
              >
                {loading ? "Procesando..." : "Reconocer rostro"}
              </button>

              <button
                onClick={detectPlate}
                disabled={!capturedImage || loading}
                className={`px-4 py-2 rounded ${
                  !capturedImage || loading
                    ? "bg-gray-300 cursor-not-allowed"
                    : "bg-purple-500 hover:bg-purple-600 text-white"
                }`}
              >
                {loading ? "Procesando..." : "Detectar placa"}
              </button>
            </div>
          </div>
        )}

        {/* Controles específicos de registro */}
        {activeTab === "registration" && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h2 className="text-xl font-semibold mb-4">Registro facial</h2>

            <div className="mb-6">
              <h3 className="text-lg font-medium mb-2">Registrar con cámara</h3>
              <button
                onClick={registerFace}
                disabled={!capturedImage || registering}
                className={`px-4 py-2 rounded ${
                  !capturedImage || registering
                    ? "bg-gray-300 cursor-not-allowed"
                    : "bg-green-500 hover:bg-green-600 text-white"
                }`}
              >
                {registering ? "Registrando..." : "Registrar mi rostro"}
              </button>
              <p className="text-sm text-gray-500 mt-2">
                Usa esta opción para registrar tu rostro actual en el sistema.
              </p>
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-medium mb-2">Registrar con archivo</h3>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="mb-3"
              />
              <div>
                <button
                  onClick={registerWithFile}
                  disabled={!selectedFile || registering}
                  className={`px-4 py-2 rounded ${
                    !selectedFile || registering
                      ? "bg-gray-300 cursor-not-allowed"
                      : "bg-green-500 hover:bg-green-600 text-white"
                  }`}
                >
                  {registering ? "Registrando..." : "Registrar con archivo"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Listado de perfiles */}
        {activeTab === "profiles" && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Perfiles faciales registrados</h2>
              <button
                onClick={loadProfiles}
                disabled={loading}
                className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm"
              >
                {loading ? "Cargando..." : "Recargar"}
              </button>
            </div>

            {loading ? (
              <div className="p-12 text-center text-gray-500">Cargando perfiles...</div>
            ) : profiles.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {profiles.map((profile) => (
                  <div key={profile.id} className="border rounded-xl overflow-hidden bg-white shadow-sm">
                    <div className="aspect-square bg-gray-100">
                      {profile.image_url ? (
                        <img
                          src={profile.image_url}
                          alt={`Perfil de ${profile.user_name}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          No hay imagen
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-medium">{profile.user_name}</h3>
                      <p className="text-sm text-gray-500">{profile.user_email}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Registrado: {profile.fecha_registro ? new Date(profile.fecha_registro).toLocaleDateString() : 'Fecha no disponible'}
                      </p>
                      <div className="mt-3 flex justify-end">
                        <button
                          onClick={() => deleteProfile(profile.id)}
                          className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500 border rounded-xl bg-gray-50">
                No hay perfiles faciales registrados
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}