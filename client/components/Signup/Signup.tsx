import React from 'react';
import './Signup.css';

// import { CircleUserRound, Lock, Laugh, Mail } from "lucide-react";

interface SignupProps {
  setUser: React.Dispatch<React.SetStateAction<boolean>>;
}

// Signup component
const Signup: React.FC<SignupProps> = ({ setUser }) => {
  const handleGoogleLogin = () => {
    setUser(true);
  };

  return null;
};

export default Signup;
