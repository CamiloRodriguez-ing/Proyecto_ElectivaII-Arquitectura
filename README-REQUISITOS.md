# Requisitos del proyecto

Este documento resume lo necesario para instalar, probar y ejecutar localmente **Student Requests Backend**.

## Requisitos obligatorios

- Windows 10/11, macOS o Linux.
- Python **3.11**. Es la misma versión configurada para las funciones AWS Lambda.
- `pip`, incluido normalmente con Python.
- Git, si se desea clonar o actualizar el repositorio.
- PowerShell en Windows o una terminal equivalente.

La dependencia de desarrollo del proyecto es:

```text
pytest>=8.0,<9.0
```

## Requisitos para AWS SAM

Son necesarios únicamente para validar la plantilla, construir el proyecto o ejecutarlo como una API local:

- AWS SAM CLI.
- Docker Desktop iniciado y funcionando.

Para desplegar recursos en AWS también se requiere:

- AWS CLI.
- Una cuenta de AWS.
- Credenciales configuradas con permisos para AWS CloudFormation, Lambda, API Gateway, IAM y los servicios que utilice el despliegue.

## Instalación

Desde la carpeta raíz del proyecto:

```powershell
python --version
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

Si PowerShell impide activar el entorno virtual, puede ejecutarse una vez:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

Después, se debe volver a activar el entorno virtual.

## Verificación

Ejecutar las pruebas unitarias:

```powershell
python -m pytest
```

Validar la plantilla SAM:

```powershell
sam validate --lint
```

Construir la aplicación con Docker:

```powershell
sam build
```

Iniciar la API local:

```powershell
sam local start-api
```

La API estará disponible normalmente en `http://127.0.0.1:3000`.

## Frontend

La carpeta `frontend/` contiene una interfaz estática. Puede abrirse `frontend/index.html` directamente en el navegador o servirse con cualquier servidor HTTP estático.

Para consumir la API local desde la interfaz, la URL base debe apuntar a:

```text
http://127.0.0.1:3000
```

## Variables de entorno

La plantilla SAM define valores de desarrollo para:

- `APP_ENV=dev`
- `DEMO_MODE=true`
- `FRONTEND_ORIGIN=*`

En producción deben revisarse especialmente `DEMO_MODE`, `FRONTEND_ORIGIN`, las credenciales de AWS y la configuración de CORS.
