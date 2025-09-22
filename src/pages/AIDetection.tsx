// pages/AIDetection.tsx - VERSIÓN CON DEBUGGING Y LOGGING DETALLADO
import { useState, useRef, useCallback, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { aiAPI, type FacialProfile } from "../services/ai";
import Navbar from "../components/Navbar";

type TabType = "recognition" | "registration" | "profiles";

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
  const [cameraStatus, setCameraStatus] = useState<'stopped' | 'starting' | 'running' | 'error'>('stopped');

  // Función de logging detallado
  const log = useCallback((message: string, data?: any) => {
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

        // Forzar reproducción
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.play().then(() => {
              log("✅ Video reanudado exitosamente");
              checkVideoState();
            }).catch((playError) => {
              log("❌ Error reanudando video:", playError);
            });
          }
        }, 100);
      }
    }
  }, [activeTab, stream, log, checkVideoState]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      try {
        const base64 = await aiAPI.fileToBase64(file);
        setCapturedImage(base64);
        setResult("Imagen cargada correctamente - Lista para usar");
        setError(null);
      } catch {
        setError('Error procesando la imagen seleccionada');
      }
    } else {
      setError('Por favor selecciona un archivo de imagen válido');
    }
  };

  // FUNCIONES DE RECONOCIMIENTO
  const recognizeFace = async () => {
    log("👤 Iniciando reconocimiento facial");

    if (!token) {
      setError("No tienes permisos para usar esta función");
      return;
    }

    if (cameraStatus !== 'running') {
      setError("Necesitas iniciar la cámara primero");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const imageData = captureImage();
      log("📡 Enviando imagen para reconocimiento");
      const response = await aiAPI.recognizeFace(token, imageData);
      log("📥 Respuesta de reconocimiento:", response);

      if (response.is_resident) {
        setResult(`Residente identificado: ${response.user?.nombre} (${response.confidence}% confianza)`);
        setMessage(`Acceso autorizado para ${response.user?.nombre}`);
      } else {
        setResult(`Persona no registrada (${response.confidence}% confianza)`);
        setMessage("Acceso denegado - Persona no identificada en el sistema");
      }
    } catch (err: unknown) {
      let errorMsg = 'Error desconocido en el reconocimiento';
      if (err instanceof Error) {
        errorMsg = err.message;
        log("❌ Error en reconocimiento:", err);
      }
      setResult(`Error: ${errorMsg}`);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const detectPlate = async () => {
    log("🚗 Iniciando detección de placa");

    if (!token) {
      setError("No tienes permisos para usar esta función");
      return;
    }

    if (cameraStatus !== 'running') {
      setError("Necesitas iniciar la cámara primero");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const imageData = captureImage();
      log("📡 Enviando imagen para detección de placa");
      const response = await aiAPI.detectPlate(token, imageData);
      log("📥 Respuesta de detección:", response);

      if (response.plate) {
        const status = response.is_authorized ? 'Autorizada' : 'No autorizada';
        setResult(`${status}: ${response.plate} (${response.confidence}% confianza)`);

        if (response.is_authorized) {
          setMessage(`Vehículo autorizado: ${response.plate}`);
        } else {
          setMessage(`Vehículo no autorizado: ${response.plate}`);
        }
      } else {
        setResult("No se detectó placa válida en la imagen");
        setMessage("Intenta capturar una imagen más clara de la placa");
      }
    } catch (err: unknown) {
      let errorMsg = 'Error desconocido en la detección';
      if (err instanceof Error) {
        errorMsg = err.message;
        log("❌ Error en detección:", err);
      }
      setResult(`Error: ${errorMsg}`);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // FUNCIONES DE REGISTRO
  const registerProfile = async () => {
    if (!token) {
      setError('No tienes permisos para registrar perfiles');
      return;
    }

    let imageToUse: string | null = null;

    if (capturedImage) {
      imageToUse = capturedImage;
    } else if (selectedFile) {
      try {
        imageToUse = await aiAPI.fileToBase64(selectedFile);
      } catch {
        setError('Error procesando el archivo seleccionado');
        return;
      }
    }

    if (!imageToUse) {
      setError('Debes capturar una foto o seleccionar una imagen');
      return;
    }

    setRegistering(true);
    setError(null);
    setMessage(null);

    try {
      const response = await aiAPI.registerCurrentUser(token, imageToUse);

      if (response.success) {
        setMessage(response.message || 'Perfil facial registrado exitosamente');
        setCapturedImage(null);
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        setResult("Perfil registrado correctamente en el sistema");

        if (activeTab === "profiles") {
          loadProfiles();
        }
      } else {
        setError(response.error || 'Error registrando perfil facial');
      }
    } catch (err: unknown) {
      let errorMsg = 'Error registrando perfil facial';
      if (err instanceof Error) {
        errorMsg = err.message;
      }
      setError(errorMsg);
    } finally {
      setRegistering(false);
    }
  };

  const loadProfiles = async () => {
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      const response = await aiAPI.listProfiles(token);
      setProfiles(response.profiles || []);
      setMessage(`Se encontraron ${response.profiles?.length || 0} perfiles registrados`);
    } catch (err: unknown) {
      let errorMsg = 'Error cargando perfiles';
      if (err instanceof Error) {
        errorMsg = err.message;
      }
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const deleteProfile = async (profileId: number) => {
    if (!token || !confirm('¿Estás seguro de que quieres eliminar este perfil facial?')) return;

    try {
      const response = await aiAPI.deleteProfile(token, profileId);
      if (response.success) {
        setMessage(response.message || 'Perfil eliminado correctamente');
        loadProfiles();
      }
    } catch (err: unknown) {
      let errorMsg = 'Error eliminando perfil';
      if (err instanceof Error) {
        errorMsg = err.message;
      }
      setError(errorMsg);
    }
  };

  const clearMessages = () => {
    setError(null);
    setMessage(null);
  };

  const resetCapture = () => {
    setCapturedImage(null);
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setResult("Listo para nueva captura");
    setError(null);
    setMessage(null);
  };

  // Cargar perfiles cuando se cambia a esa pestaña
  useEffect(() => {
    if (activeTab === "profiles" && token) {
      loadProfiles();
    }
  }, [activeTab, token]);

  // Limpiar errores al cambiar de pestaña
  useEffect(() => {
    clearMessages();
  }, [activeTab]);

  // Cleanup al desmontar el componente
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  // Función para obtener el estado visual de la cámara
  const getCameraStatusDisplay = () => {
    switch (cameraStatus) {
      case 'starting':
        return { color: 'text-yellow-600', bg: 'bg-yellow-500', text: 'Iniciando...' };
      case 'running':
        return { color: 'text-green-600', bg: 'bg-green-500', text: 'Cámara activa' };
      case 'error':
        return { color: 'text-red-600', bg: 'bg-red-500', text: 'Error en cámara' };
      default:
        return { color: 'text-gray-500', bg: 'bg-gray-400', text: 'Cámara inactiva' };
    }
  };

  const statusDisplay = getCameraStatusDisplay();

  // @ts-ignore
  // @ts-ignore
  // @ts-ignore
  // @ts-ignore
  return (
    <div className="min-h-dvh bg-gradient-to-br from-cyan-50 via-blue-50 to-cyan-100">
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold">Sistema de Reconocimiento IA</h1>

          {/* Botón de debug */}
          <button
            onClick={() => {
              log("🔍 DEBUG INFO - Estado actual del sistema");
              checkVideoState();
              log("📊 Estados actuales:", {
                cameraStatus,
                streamActive: stream?.active,
                streamId: stream?.id,
                videoSrcObject: !!videoRef.current?.srcObject,
                activeTab
              });
            }}
            className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
          >
            Debug Info (ver consola F12)
          </button>
        </div>

        {/* Mensajes */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 flex justify-between items-start">
            <div className="flex-1">
              <strong>Error:</strong> {error}
            </div>
            <button onClick={clearMessages} className="ml-2 text-red-600 hover:text-red-800 font-bold">×</button>
          </div>
        )}

        {message && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl text-green-800 flex justify-between items-start">
            <div className="flex-1">
              <strong>Éxito:</strong> {message}
            </div>
            <button onClick={clearMessages} className="ml-2 text-green-600 hover:text-green-800 font-bold">×</button>
          </div>
        )}

        {/* Pestañas */}
        <div className="mb-6">
          <div className="border-b border-slate-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab("recognition")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "recognition"
                    ? "border-cyan-500 text-cyan-600"
                    : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                }`}
              >
                Reconocimiento
              </button>
              <button
                onClick={() => setActiveTab("registration")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "registration"
                    ? "border-cyan-500 text-cyan-600"
                    : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                }`}
              >
                Registro Facial
              </button>
              <button
                onClick={() => setActiveTab("profiles")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "profiles"
                    ? "border-cyan-500 text-cyan-600"
                    : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                }`}
              >
                Perfiles
              </button>
            </nav>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6">
          {/* Pestaña de Reconocimiento */}
          {activeTab === "recognition" && (
            <>
              <div className="mb-6 flex justify-center">
                <div className="relative">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full max-w-lg h-80 bg-black rounded-lg border-2 border-slate-300"
                  />

                  {cameraStatus !== 'running' && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center text-white">
                      <div className="text-center">
                        <div className="text-4xl mb-2">📷</div>
                        <div className="text-lg font-medium">
                          {cameraStatus === 'starting' ? 'Iniciando cámara...' :
                           cameraStatus === 'error' ? 'Error en cámara' :
                           'Cámara desactivada'}
                        </div>
                        <div className="text-sm opacity-75">
                          {cameraStatus === 'stopped' && 'Presiona "Iniciar Cámara" para comenzar'}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <canvas ref={canvasRef} className="hidden" />
              </div>

              <div className="flex justify-center mb-4">
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full mr-2 ${statusDisplay.bg}`}></div>
                  <span className={`text-sm font-medium ${statusDisplay.color}`}>
                    {statusDisplay.text}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 justify-center mb-6">
                {cameraStatus === 'stopped' || cameraStatus === 'error' ? (
                  <button
                    onClick={startCamera}
                    disabled={cameraStatus === 'starting'}
                    className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {cameraStatus === 'starting' ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Iniciando...
                      </>
                    ) : (
                      <>
                        Iniciar Cámara
                      </>
                    )}
                  </button>
                ) : (
                  <>
                    <button
                      onClick={recognizeFace}
                      disabled={loading || cameraStatus !== 'running'}
                      className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {loading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Reconociendo...
                        </>
                      ) : (
                        <>
                          Reconocer Cara
                        </>
                      )}
                    </button>
                    <button
                      onClick={detectPlate}
                      disabled={loading || cameraStatus !== 'running'}
                      className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {loading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Detectando...
                        </>
                      ) : (
                        <>
                          Detectar Placa
                        </>
                      )}
                    </button>
                    <button
                      onClick={stopCamera}
                      className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 flex items-center gap-2"
                    >
                      Detener Cámara
                    </button>
                  </>
                )}
              </div>

              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <h3 className="font-semibold mb-2 text-slate-700">Resultado del Análisis:</h3>
                <p className="text-sm text-slate-600 font-medium">{result}</p>
              </div>
            </>
          )}

          {/* Pestaña de Registro */}
          {activeTab === "registration" && (
            <div className="grid lg:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-4 text-slate-700">Capturar o subir imagen</h3>

                <div className="mb-4">
                  <div className="relative">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className={`w-full h-48 bg-black rounded-lg border-2 ${cameraStatus === 'running' ? 'border-green-300' : 'border-slate-300'}`}
                      style={{ display: cameraStatus === 'running' ? 'block' : 'none' }}
                    />

                    {capturedImage && (
                      <div className={`${cameraStatus === 'running' ? 'mt-2' : ''}`}>
                        <img
                          src={capturedImage}
                          alt="Imagen capturada"
                          className="w-full h-48 object-cover rounded-lg border-2 border-cyan-300"
                        />
                        <p className="text-center text-sm text-green-600 mt-1 font-medium">Imagen lista para registrar</p>
                      </div>
                    )}

                    {cameraStatus !== 'running' && !capturedImage && (
                      <div className="w-full h-48 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500 border-2 border-dashed border-slate-300">
                        <div className="text-center">
                          <div className="text-3xl mb-2">📷</div>
                          <div>Cámara apagada</div>
                          <div className="text-xs">Inicia la cámara o sube una imagen</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 mb-4 flex-wrap">
                  {cameraStatus === 'stopped' || cameraStatus === 'error' ? (
                    <button
                      onClick={startCamera}
                      disabled={cameraStatus === 'starting'}
                      className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 flex items-center gap-1"
                    >
                      {cameraStatus === 'starting' ? (
                        <>
                          <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                          Iniciando...
                        </>
                      ) : (
                        <>
                          Iniciar Cámara
                        </>
                      )}
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={capturePhoto}
                        className="px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center gap-1"
                        title="Capturar foto actual de la cámara"
                      >
                        Capturar
                      </button>
                      <button
                        onClick={stopCamera}
                        className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 flex items-center gap-1"
                      >
                        Detener
                      </button>
                    </>
                  )}

                  <div className="flex items-center text-sm px-3 py-2 bg-slate-100 rounded-lg">
                    <div className={`w-2 h-2 rounded-full mr-2 ${statusDisplay.bg}`}></div>
                    <span className={statusDisplay.color}>
                      {statusDisplay.text}
                    </span>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block font-medium mb-2 text-slate-700">O subir imagen:</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="w-full p-2 border border-slate-300 rounded-lg hover:border-cyan-400 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  />
                  <p className="text-xs text-slate-500 mt-1">Formatos soportados: JPG, PNG, WebP</p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={registerProfile}
                    disabled={registering || (!capturedImage && !selectedFile)}
                    className="flex-1 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {registering ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Registrando...
                      </>
                    ) : (
                      <>
                        Registrar Mi Perfil
                      </>
                    )}
                  </button>

                  <button
                    onClick={resetCapture}
                    className="px-4 py-2 bg-slate-500 text-white rounded-lg hover:bg-slate-600 flex items-center gap-1"
                  >
                    Limpiar
                  </button>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-4 text-slate-700">Información</h3>

                <div className="bg-blue-50 p-4 rounded-lg mb-4 border border-blue-200">
                  <h4 className="font-medium text-blue-800 mb-2">¿Cómo registrar tu cara?</h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Asegúrate de tener buena iluminación</li>
                    <li>• Mira directamente a la cámara</li>
                    <li>• Mantén una expresión neutral</li>
                    <li>• Evita usar lentes o gorros</li>
                    <li>• Una sola persona en la imagen</li>
                    <li>• La imagen debe ser clara y nítida</li>
                  </ul>
                </div>

                {user && (
                  <div className="bg-slate-50 p-4 rounded-lg mb-4 border border-slate-200">
                    <h4 className="font-medium mb-2 text-slate-700">Usuario actual:</h4>
                    <p className="text-sm">
                      <strong>Nombre:</strong> {user.nombre} {user.apellido}
                    </p>
                    <p className="text-sm">
                      <strong>Correo:</strong> {user.correo}
                    </p>
                    <p className="text-sm">
                      <strong>Rol:</strong> {user.rol?.descripcion || 'No definido'}
                    </p>
                  </div>
                )}

                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <h4 className="font-semibold mb-2 text-slate-700">Estado actual:</h4>
                  <p className="text-sm text-slate-600">{result}</p>

                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                      <span>Progreso del registro</span>
                      <span>{capturedImage || selectedFile ? '100%' : '0%'}</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
                          capturedImage || selectedFile ? 'bg-green-500 w-full' : 'bg-slate-300 w-0'
                        }`}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Pestaña de Perfiles */}
          {activeTab === "profiles" && (
            <>
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-semibold text-slate-700">Perfiles Faciales Registrados</h3>
                <button
                  onClick={loadProfiles}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Cargando...
                    </>
                  ) : (
                    <>
                      Actualizar
                    </>
                  )}
                </button>
              </div>

              {loading ? (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                  <p className="text-slate-500">Cargando perfiles registrados...</p>
                </div>
              ) : profiles.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">👤</div>
                  <h4 className="text-lg font-medium text-slate-700 mb-2">No hay perfiles registrados</h4>
                  <p className="text-slate-500 mb-6">
                    Aún no se han registrado perfiles faciales en el sistema.
                  </p>
                  <button
                    onClick={() => setActiveTab("registration")}
                    className="px-6 py-3 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 inline-flex items-center gap-2"
                  >
                    Registrar mi perfil
                  </button>
                </div>
              ) : (
                <>
                  <div className="bg-gradient-to-r from-cyan-50 to-blue-50 rounded-lg p-4 mb-6 border border-cyan-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-cyan-800">Estadísticas del Sistema</h4>
                        <p className="text-sm text-cyan-600">
                          Total de perfiles registrados: <strong>{profiles.length}</strong>
                        </p>
                      </div>
                      <div className="text-3xl">👥</div>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {profiles.map((profile) => (
                      <div key={profile.id} className="border border-slate-200 rounded-xl p-4 hover:shadow-md transition-shadow bg-white">
                        <div className="mb-4">
                          {profile.image_url ? (
                            <img
                              src={profile.image_url}
                              alt={`Perfil de ${profile.user_name}`}
                              className="w-full h-32 object-cover rounded-lg border-2 border-slate-200"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2Y4ZmFmYyIvPjx0ZXh0IHg9IjUwIiB5PSI1MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSIjNjQ3NDhiIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+SW1hZ2VuIG5vIGRpc3BvbmlibGU8L3RleHQ+PC9zdmc+';
                              }}
                            />
                          ) : (
                            <div className="w-full h-32 bg-slate-100 rounded-lg flex items-center justify-center border-2 border-dashed border-slate-300">
                              <div className="text-center text-slate-500">
                                <div className="text-2xl mb-1">👤</div>
                                <div className="text-xs">Sin imagen</div>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="space-y-2">
                          <h4 className="font-medium text-slate-800 truncate">
                            {profile.user_name}
                          </h4>
                          <p className="text-sm text-slate-500 truncate">
                            {profile.user_email}
                          </p>
                          <p className="text-xs text-slate-400">
                            Registrado: {new Date(profile.fecha_registro).toLocaleDateString('es-ES', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </p>

                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${profile.activo ? 'bg-green-500' : 'bg-red-500'}`}></div>
                            <span className={`text-xs font-medium ${profile.activo ? 'text-green-600' : 'text-red-600'}`}>
                              {profile.activo ? 'Activo' : 'Inactivo'}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => deleteProfile(profile.id)}
                          className="w-full mt-4 px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm font-medium transition-colors flex items-center justify-center gap-1"
                        >
                          Eliminar perfil
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="mt-8 text-center">
                    <button
                      onClick={() => setActiveTab("registration")}
                      className="px-6 py-3 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 inline-flex items-center gap-2 font-medium"
                    >
                      Registrar nuevo perfil
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>

        <div className="mt-8 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-6 border border-blue-200">
          <h3 className="font-semibold text-blue-800 mb-3">Consejos para un mejor rendimiento</h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm text-blue-700">
            <div>
              <h4 className="font-medium mb-2">Para el reconocimiento facial:</h4>
              <ul className="space-y-1">
                <li>• Mantén buena iluminación frontal</li>
                <li>• Evita sombras en el rostro</li>
                <li>• Mira directamente a la cámara</li>
                <li>• Mantén el rostro centrado</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Para la detección de placas:</h4>
              <ul className="space-y-1">
                <li>• Asegúrate de que la placa sea visible</li>
                <li>• Evita reflejos en la placa</li>
                <li>• Mantén una distancia adecuada</li>
                <li>• La placa debe estar limpia</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}