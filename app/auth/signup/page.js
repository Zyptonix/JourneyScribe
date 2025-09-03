'use client';
import { useState, useRef, useEffect } from 'react';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { db, auth } from '@/lib/firebaseClient';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { doc, setDoc } from 'firebase/firestore';

// --- REACT-IMAGE-CROP IMPORTS ---
import ReactCrop, { Crop, centerCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

// --- HELPER FUNCTION: GET CROPPED IMAGE BLOB ---
const getCroppedImage = (image, crop) => {
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    canvas.width = crop.width;
    canvas.height = crop.height;
    const ctx = canvas.getContext('2d');

    ctx.drawImage(
        image,
        crop.x * scaleX,
        crop.y * scaleY,
        crop.width * scaleX,
        crop.height * scaleY,
        0, 0,
        crop.width,
        crop.height
    );

    return new Promise((resolve, reject) => {
        canvas.toBlob(blob => {
            if (!blob) {
                reject(new Error('Canvas is empty'));
                return;
            }
            resolve(blob);
        }, 'image/jpeg');
    });
};

// --- HELPER COMPONENT: PASSWORD CRITERIA ITEM ---
const CriteriaItem = ({ label, met }) => (
    <div className={`flex items-center transition-colors duration-300 ${met ? 'text-green-600' : 'text-slate-500'}`}>
        {met ? (
            <svg className="w-4 h-4 mr-1 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
        ) : (
            <svg className="w-4 h-4 mr-1 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
        )}
        {label}
    </div>
);


export default function SignupPage() {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        fullName: '',
        username: '',
        travelStyles: [],
        interests: [],
        budgetRange: '',
        dietaryRestrictions: [],
        profilePicture: '',
    });

    // --- STATE FOR PASSWORD VALIDATION ---
    const [passwordCriteria, setPasswordCriteria] = useState({
        minLength: false,
        hasUpper: false,
        hasLower: false,
        hasNumber: false,
        hasSpecial: false,
    });

    // --- STATE FOR IMAGE CROPPING & UPLOAD ---
    const imgRef = useRef(null);
    const [imageSrc, setImageSrc] = useState(null);
    const [crop, setCrop] = useState();
    const [completedCrop, setCompletedCrop] = useState(null);
    const [croppedImageBlob, setCroppedImageBlob] = useState(null);
    const [croppedImagePreview, setCroppedImagePreview] = useState(null);

    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const step1Ref = useRef(null);
    const step2Ref = useRef(null);
    const step3Ref = useRef(null);

    const travelStyleOptions = ['Adventure', 'Relaxing', 'Cultural', 'Budget-friendly', 'Luxury', 'Family', 'Solo'];
    const interestOptions = ['Hiking', 'Beaches', 'Food & Culinary', 'Museums & History', 'Nightlife', 'Photography', 'Shopping', 'Nature', 'Sports'];
    const budgetRangeOptions = ['Under $500', '$500 - $1500', '$1500 - $5000', 'Over $5000'];
    const dietaryRestrictionsOptions = ['Vegetarian', 'Vegan', 'Gluten-Free', 'Halal', 'Kosher', 'Dairy-Free', 'Nut Allergy'];

    // --- EFFECT FOR REAL-TIME PASSWORD VALIDATION ---
    useEffect(() => {
        const password = formData.password;
        setPasswordCriteria({
            minLength: password.length >= 8,
            hasUpper: /[A-Z]/.test(password),
            hasLower: /[a-z]/.test(password),
            hasNumber: /[0-9]/.test(password),
            hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password),
        });
    }, [formData.password]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        if (type === 'checkbox') {
            setFormData((prev) => ({
                ...prev,
                [name]: checked
                    ? [...prev[name], value]
                    : prev[name].filter((item) => item !== value),
            }));
        } else {
            setFormData((prev) => ({ ...prev, [name]: value }));
        }
    };

    // --- IMAGE HANDLING FUNCTIONS ---
    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            if (file.size > 4 * 1024 * 1024) { // 4MB limit
                setError('File is too large. Please select an image under 4MB.');
                return;
            }
            setError('');
            setCroppedImageBlob(null);
            setCroppedImagePreview(null);
            const reader = new FileReader();
            reader.addEventListener('load', () => {
                setImageSrc(reader.result?.toString() || '');
                setCompletedCrop(null);
            });
            reader.readAsDataURL(file);
        }
    };

    const onImageLoad = (e) => {
        const { width, height } = e.currentTarget;
        const crop = centerCrop({ unit: '%', width: 50, aspect: 1 }, width, height);
        setCrop(crop);
    };

    const handleConfirmCrop = async () => {
        if (!completedCrop || !imgRef.current) {
            setError("Please select and crop the image first.");
            return;
        }
        try {
            const blob = await getCroppedImage(imgRef.current, completedCrop);
            setCroppedImageBlob(blob);
            setCroppedImagePreview(URL.createObjectURL(blob));
            setImageSrc(null); // Hide the cropper UI after confirming
        } catch (e) {
            console.error(e);
            setError("Could not crop the image. Please try again.");
        }
    };

    const scrollToStep = (ref) => {
        ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const handleNextStep = async (e) => {
        e.preventDefault();
        setError('');

        if (step === 1) {
            if (formData.password !== formData.confirmPassword) {
                setError('Passwords do not match.');
                return;
            }
            const allCriteriaMet = Object.values(passwordCriteria).every(Boolean);
            if (!allCriteriaMet) {
                setError('Please ensure your password meets all the criteria.');
                return;
            }
            setStep(2);
            setTimeout(() => scrollToStep(step2Ref), 100);
        } else if (step === 2) {
            if (!formData.fullName || !formData.username) {
                setError('Please fill in your Full Name and Username.');
                return;
            }
            setStep(3);
            setTimeout(() => scrollToStep(step3Ref), 100);
        }
    };

    const handleFinalSignup = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
            const user = userCredential.user;
            const userId = user.uid;
            
            let finalProfilePicture = '';

            if (croppedImageBlob) {
                const imgbbApiKey = process.env.NEXT_PUBLIC_IMGBB_API_KEY;
                if (!imgbbApiKey) throw new Error("ImgBB API key is not configured.");

                const imgFormData = new FormData();
                imgFormData.append('image', croppedImageBlob);

                const response = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbApiKey}`, {
                    method: 'POST',
                    body: imgFormData,
                });

                const result = await response.json();
                if (result.success) {
                    finalProfilePicture = result.data.url;
                    await updateProfile(user, { photoURL: finalProfilePicture });
                } else {
                    console.warn("ImgBB upload failed, proceeding without profile picture:", result.error.message);
                }
            }

            const userDocRef = doc(db, `userProfiles`, userId);
            await setDoc(userDocRef, {
                fullName: formData.fullName,
                username: formData.username,
                email: formData.email,
                profilePicture: finalProfilePicture,
                travelStyles: formData.travelStyles,
                interests: formData.interests,
                budgetRange: formData.budgetRange,
                dietaryRestrictions: formData.dietaryRestrictions,
                createdAt: new Date(),
            });
            
            router.push('/');

        } catch (err) {
            console.error("Signup process error:", err);
            setError(err.message || 'An unexpected error occurred during signup.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative min-h-screen flex items-center justify-center p-4 font-inter overflow-hidden">
            <div
                className="absolute inset-0 bg-cover bg-center"
                style={{
                    backgroundImage: "url('/assets/authBackground.jpg')",
                    filter: "blur(1px)",
                    transform: "scale(1.05)"
                }}
            ></div>
            <div className="absolute inset-0 bg-black opacity-10"></div>

            <div className="relative z-10 w-full max-w-lg mx-auto bg-white p-8 rounded-xl shadow-2xl transition-all duration-300 ease-in-out">
                <div className="mb-6 text-center text-sm font-medium text-slate-600">
                    Step {step} of 3
                </div>

                {error && (
                    <p className="mb-4 rounded-md bg-red-100 p-3 text-sm font-medium text-red-700">
                        Error: {error}
                    </p>
                )}

                {/* Step 1: Account Creation */}
                <div ref={step1Ref} className={`transition-opacity duration-500 ${step === 1 ? 'opacity-100 block' : 'opacity-0 hidden'}`}>
                    <h2 className="mb-2 flex items-center justify-center gap-2 text-3xl font-bold text-slate-800">
                        Create Your Account ✨
                    </h2>
                    <p className="mb-6 text-center text-sm text-slate-500">
                        Join us and get started!
                    </p>
                    <form onSubmit={handleNextStep} className="space-y-6">
                        <input type="email" name="email" placeholder="Email Address" className="w-full rounded-lg border border-slate-300 bg-slate-50 p-3 text-slate-800 placeholder-slate-400 outline-none transition-colors duration-200 focus:border-green-500 focus:ring-2 focus:ring-green-500" value={formData.email} onChange={handleChange} required disabled={loading} />
                        <div>
                            <input type="password" name="password" placeholder="Password" className="w-full rounded-lg border border-slate-300 bg-slate-50 p-3 text-slate-800 placeholder-slate-400 outline-none transition-colors duration-200 focus:border-green-500 focus:ring-2 focus:ring-green-500" value={formData.password} onChange={handleChange} required disabled={loading} />
                            {formData.password && (
                                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs">
                                    <CriteriaItem label="At least 8 characters" met={passwordCriteria.minLength} />
                                    <CriteriaItem label="One uppercase letter" met={passwordCriteria.hasUpper} />
                                    <CriteriaItem label="One lowercase letter" met={passwordCriteria.hasLower} />
                                    <CriteriaItem label="One number" met={passwordCriteria.hasNumber} />
                                    <CriteriaItem label="One special character" met={passwordCriteria.hasSpecial} />
                                </div>
                            )}
                        </div>
                        <input type="password" name="confirmPassword" placeholder="Confirm Password" className="w-full rounded-lg border border-slate-300 bg-slate-50 p-3 text-slate-800 placeholder-slate-400 outline-none transition-colors duration-200 focus:border-green-500 focus:ring-2 focus:ring-green-500" value={formData.confirmPassword} onChange={handleChange} required disabled={loading} />
                        <button type="submit" className="w-full rounded-lg bg-green-600 p-3 font-semibold text-white transition-colors duration-200 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50" disabled={loading}>
                            Next: Profile Info
                        </button>
                    </form>
                </div>

                {/* Step 2: Basic Profile Information */}
                <div ref={step2Ref} className={`transition-opacity duration-500 ${step === 2 ? 'opacity-100 block' : 'opacity-0 hidden'}`}>
                    <h2 className="mb-2 flex items-center justify-center gap-2 text-3xl font-bold text-slate-800">
                        Tell Us About Yourself 👋
                    </h2>
                    <p className="mb-6 text-center text-sm text-slate-500">
                        Help us personalize your experience.
                    </p>
                    <form onSubmit={handleNextStep} className="space-y-6">
                        <input type="text" name="fullName" placeholder="Full Name" className="w-full rounded-lg border border-slate-300 bg-slate-50 p-3 text-slate-800 placeholder-slate-400 outline-none transition-colors duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500" value={formData.fullName} onChange={handleChange} required disabled={loading} />
                        <input type="text" name="username" placeholder="Username" className="w-full rounded-lg border border-slate-300 bg-slate-50 p-3 text-slate-800 placeholder-slate-400 outline-none transition-colors duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500" value={formData.username} onChange={handleChange} required disabled={loading} />
                        
                        <div className="p-4 rounded-xl bg-slate-100 border">
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Profile Picture (Optional)
                            </label>
                            
                            {!imageSrc && (
                                <div className="flex flex-col items-center space-y-3">
                                    <img src={croppedImagePreview || 'https://placehold.co/128x128/e2e8f0/64748b?text=Avatar'} alt="Profile Preview" className="w-24 h-24 rounded-full object-cover border-4 border-slate-200"/>
                                    <label htmlFor="profilePictureUpload" className="cursor-pointer rounded-md bg-white px-3 py-1.5 text-sm font-semibold text-slate-600 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50">
                                        {croppedImagePreview ? 'Choose a Different Image' : 'Choose Image'}
                                    </label>
                                    <input type="file" id="profilePictureUpload" accept="image/*" onChange={handleFileChange} className="hidden" />
                                </div>
                            )}

                            {imageSrc && (
                                <>
                                    <div className="mt-4 flex justify-center border border-slate-300 rounded-md overflow-hidden bg-slate-800">
                                        <ReactCrop crop={crop} onChange={c => setCrop(c)} onComplete={(c) => setCompletedCrop(c)} aspect={1} circularCrop>
                                            <img ref={imgRef} src={imageSrc} onLoad={onImageLoad} alt="Source" className="max-w-full h-auto" />
                                        </ReactCrop>
                                    </div>
                                    <button type="button" onClick={handleConfirmCrop} disabled={!completedCrop} className="mt-4 w-full px-6 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 transition-colors disabled:bg-gray-500">
                                        Confirm Crop
                                    </button>
                                </>
                            )}
                        </div>
                        
                        <div className="flex justify-between space-x-4">
                            <button type="button" onClick={() => { setStep(1); setTimeout(() => scrollToStep(step1Ref), 100); }} className="w-1/2 rounded-lg bg-slate-300 p-3 font-semibold text-slate-700 transition-colors duration-200 hover:bg-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2" disabled={loading}>
                                Back
                            </button>
                            <button type="submit" className="w-1/2 rounded-lg bg-green-600 p-3 font-semibold text-white transition-colors duration-200 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2" disabled={loading}>
                                Next: Preferences
                            </button>
                        </div>
                    </form>
                </div>

                {/* Step 3: Personalization and Preferences */}
                <div ref={step3Ref} className={`transition-opacity duration-500 ${step === 3 ? 'opacity-100 block' : 'opacity-0 hidden'}`}>
                     <h2 className="mb-2 flex items-center justify-center gap-2 text-3xl font-bold text-slate-800">
                        Your Travel Preferences 🌍
                    </h2>
                    <p className="mb-6 text-sm text-slate-500 text-center">
                        Tell us how you like to travel for tailored recommendations.
                    </p>
                    <form onSubmit={handleFinalSignup} className="space-y-6">
                        <div>
                            <label className="block text-left text-sm font-medium text-slate-700 mb-2">Preferred Travel Style</label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {travelStyleOptions.map((style) => (
                                    <label key={style} className="flex items-center space-x-2 cursor-pointer p-2 rounded-lg bg-slate-50 hover:bg-blue-50 transition-colors duration-200">
                                        <input type="checkbox" name="travelStyles" value={style} checked={formData.travelStyles.includes(style)} onChange={handleChange} className="form-checkbox text-blue-600 rounded" disabled={loading}/>
                                        <span className="text-sm text-slate-700">{style}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-left text-sm font-medium text-slate-700 mb-2">Interests</label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {interestOptions.map((interest) => (
                                    <label key={interest} className="flex items-center space-x-2 cursor-pointer p-2 rounded-lg bg-slate-50 hover:bg-purple-50 transition-colors duration-200">
                                        <input type="checkbox" name="interests" value={interest} checked={formData.interests.includes(interest)} onChange={handleChange} className="form-checkbox text-purple-600 rounded" disabled={loading}/>
                                        <span className="text-sm text-slate-700">{interest}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-left text-sm font-medium text-slate-700 mb-2">Budget Range</label>
                            <select name="budgetRange" value={formData.budgetRange} onChange={handleChange} className="w-full rounded-lg border border-slate-300 bg-slate-50 p-3 text-slate-800 outline-none transition-colors duration-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500" required disabled={loading}>
                                <option value="">Select your budget</option>
                                {budgetRangeOptions.map((budget) => (<option key={budget} value={budget}>{budget}</option>))}
                            </select>
                        </div>

                        <div className="flex justify-between space-x-4">
                            <button type="button" onClick={() => { setStep(2); setTimeout(() => scrollToStep(step2Ref), 100); }} className="w-1/2 rounded-lg bg-slate-300 p-3 font-semibold text-slate-700 transition-colors duration-200 hover:bg-slate-400" disabled={loading}>
                                Back
                            </button>
                            <button type="submit" className="w-1/2 rounded-lg bg-blue-600 p-3 font-semibold text-white transition-colors duration-200 hover:bg-blue-700 flex items-center justify-center" disabled={loading}>
                                {loading ? (
                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                ) : ( 'Create Account' )}
                            </button>
                        </div>
                    </form>
                </div>

                <p className="mt-6 text-sm text-slate-500 text-center">
                    Already have an account?{' '}
                    <Link href="/auth/login" className="font-semibold text-blue-600 hover:underline">
                        Sign in
                    </Link>
                </p>
            </div>
        </div>
    );
}