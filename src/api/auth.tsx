// src/api/auth.tsx
import {
  getUsers,
  saveUsers,
  nextUserId,
  generateCode,
  setCurrentEmail,
  type LocalUser,
} from "./localStorageDb";

type RegisterReq = {
  fullName?: string;
  phone?: string;
  email: string;
  password: string;
};

type LoginReq = { email: string; password: string; role?: string };

// Simula latencia de red (opcional)
const delay = (ms = 200) => new Promise((res) => setTimeout(res, ms));

// Genera un token falso pero con formato JWT-ish
function generateFakeToken(user: LocalUser): string {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = btoa(
    JSON.stringify({
      sub: user.id,
      email: user.email,
      role: user.role,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7 días
    })
  );
  const signature = btoa(`local-${user.id}-${Date.now()}`);
  return `${header}.${payload}.${signature}`;
}

export async function registerUser(data: RegisterReq) {
  await delay();
  const users = getUsers();

  const exists = users.some(
    (u) => u.email.toLowerCase() === data.email.toLowerCase()
  );
  if (exists) {
    throw new Error("El email ya está registrado");
  }

  const newUser: LocalUser = {
    id: nextUserId(),
    email: data.email,
    password: data.password,
    role: "CLIENTE",
    fullName: data.fullName,
    phone: data.phone,
    createdAt: new Date().toISOString(),
    isVerified: false,
    verificationCode: generateCode(),
  };

  users.push(newUser);
  saveUsers(users);

  return {
    message: "Usuario registrado. Revisá tu email para verificar la cuenta.",
    user: {
      id: newUser.id,
      email: newUser.email,
      role: newUser.role,
      fullName: newUser.fullName,
      isVerified: newUser.isVerified,
    },
    // En un backend real esto se manda por email. Acá lo devolvemos
    // para que puedas probar el flujo de verificación.
    verificationCode: newUser.verificationCode,
  };
}

export async function loginUser(data: LoginReq) {
  await delay();
  const users = getUsers();

  const user = users.find(
    (u) => u.email.toLowerCase() === data.email.toLowerCase()
  );

  if (!user || user.password !== data.password) {
    throw new Error("Credenciales inválidas");
  }

  if (!user.isVerified) {
    throw new Error(
      "Tu cuenta no está verificada. Revisá tu email o solicitá un nuevo código."
    );
  }

  // Marca el email actual para que otras partes de la app lo lean
  setCurrentEmail(user.email);

  const token = generateFakeToken(user);

  return {
    token,
    role: user.role,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
      phone: user.phone,
      address: user.address,
      profileImage: user.profileImage,
      isVerified: user.isVerified,
    },
  };
}

export async function sendVerificationCode(email: string) {
  await delay();
  const users = getUsers();
  const idx = users.findIndex(
    (u) => u.email.toLowerCase() === email.toLowerCase()
  );

  if (idx === -1) {
    throw new Error("El email no está registrado");
  }

  const code = generateCode();
  users[idx].verificationCode = code;
  saveUsers(users);

  return {
    message: "Código enviado. En local, mirá la consola.",
    // Esto es lo que en un backend iría por email. Lo mostramos en consola.
    code,
  };
}

export async function verifyCode(email: string, code: string) {
  await delay();
  const users = getUsers();
  const idx = users.findIndex(
    (u) => u.email.toLowerCase() === email.toLowerCase()
  );

  if (idx === -1) {
    throw new Error("El email no está registrado");
  }

  if (users[idx].verificationCode !== code) {
    throw new Error("Código inválido");
  }

  users[idx].isVerified = true;
  delete users[idx].verificationCode;
  saveUsers(users);

  return { message: "Cuenta verificada correctamente" };
}

export async function requestPasswordReset(email: string) {
  await delay();
  const users = getUsers();
  const idx = users.findIndex(
    (u) => u.email.toLowerCase() === email.toLowerCase()
  );

  if (idx === -1) {
    // Por seguridad, no revelamos si existe o no
    return { message: "Si el email existe, recibirás un enlace de recuperación" };
  }

  const token = generateCode() + generateCode(); // 12 dígitos
  users[idx].resetToken = token;
  saveUsers(users);

  return {
    message: "Token de recuperación generado. En local, mirá la consola.",
    token, // en backend real iría por email
  };
}

export async function resetPassword(email: string, token: string, newPassword: string) {
  await delay();
  const users = getUsers();
  const idx = users.findIndex(
    (u) => u.email.toLowerCase() === email.toLowerCase()
  );

  if (idx === -1) {
    throw new Error("Usuario no encontrado");
  }

  if (users[idx].resetToken !== token) {
    throw new Error("Token inválido o expirado");
  }

  users[idx].password = newPassword;
  delete users[idx].resetToken;
  saveUsers(users);

  return { message: "Contraseña actualizada correctamente" };
}