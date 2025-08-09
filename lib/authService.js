// lib/authService.js
import { auth, googleProvider, facebookProvider } from './firebaseClient';
import {
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut
} from 'firebase/auth';

export const signUpEmail = (email, password) =>
  createUserWithEmailAndPassword(auth, email, password);

export const loginEmail = (email, password) =>
  signInWithEmailAndPassword(auth, email, password);

export const loginGoogle = () =>
  signInWithPopup(auth, googleProvider);

export const loginFacebook = () =>
  signInWithPopup(auth, facebookProvider);

export const resetPassword = (email) =>
  sendPasswordResetEmail(auth, email);

export const logout = () => signOut(auth);
