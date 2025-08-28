'use client';

import React, { useState, useEffect, useRef } from 'react';
import { auth, db } from '@/lib/firebaseClient';
import { onAuthStateChanged, updateProfile } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import Link from 'next/link';
import NavigationBarLight from '@/components/NavigationBarLight';

// Import react-image-crop and its styles
import ReactCrop, {
  Crop,
  centerCrop,
} from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

// Utility function to get the cropped image as a Blob
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
    0,
    0,
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

// Component for displaying user preferences as tags
const InfoTag = ({ children }) => (
    <span className="bg-white/10 text-blue-200 text-xs font-semibold px-2.5 py-1 rounded-full border border-white/20">
        {children}
    </span>
);

export default function UserProfilePage() {
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [currentFirebaseUser, setCurrentFirebaseUser] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  // Form states for editable fields
  const [formFullName, setFormFullName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formTravelStyles, setFormTravelStyles] = useState([]);
  const [formInterests, setFormInterests] = useState([]);
  const [formBudgetRange, setFormBudgetRange] = useState('');
  const [formDietaryRestrictions, setFormDietaryRestrictions] = useState([]);
  const [formProfilePicture, setFormProfilePicture] = useState('');

  // Image cropping states and refs
  const [crop, setCrop] = useState();
  const [imageSrc, setImageSrc] = useState(null);
  const imgRef = useRef(null);
  const [completedCrop, setCompletedCrop] = useState(null);

  // New states for image upload
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageUploadError, setImageUploadError] = useState(null);
  const [imageUploadSuccess, setImageUploadSuccess] = useState(false);

  const travelStyleOptions = ['Adventure', 'Relaxing', 'Cultural', 'Budget-friendly', 'Luxury', 'Family', 'Solo'];
  const interestOptions = ['Hiking', 'Beaches', 'Food & Culinary', 'Museums & History', 'Nightlife', 'Photography', 'Shopping', 'Nature', 'Sports'];
  const budgetRangeOptions = ['Under $500', '$500 - $1500', '$1500 - $5000', 'Over $5000'];
  const dietaryRestrictionsOptions = ['Vegetarian', 'Vegan', 'Gluten-Free', 'Halal', 'Kosher', 'Dairy-Free', 'Nut Allergy'];

  useEffect(() => {
    if (!auth || !db) {
      console.warn("Firebase Auth or Firestore not initialized.");
      setIsAuthReady(true);
      setLoading(false);
      setError("Firebase services not configured. Cannot load profile.");
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentFirebaseUser(user);
      setIsAuthReady(true);
      if (!user) {
        setLoading(false);
        setProfileData(null);
        setError(null);
      }
    });

    return () => unsubscribe();
  }, [auth, db]);

  useEffect(() => {
    if (isAuthReady) {
      if (currentFirebaseUser && db) {
        fetchUserProfile(currentFirebaseUser.uid);
      } else if (!currentFirebaseUser) {
        setLoading(false);
        setProfileData(null);
      } else if (!db) {
        setLoading(false);
        setError("Firestore (db) not initialized. Cannot fetch profile.");
        setProfileData(null);
      }
    }
  }, [isAuthReady, currentFirebaseUser, db]);

  const fetchUserProfile = async (uid) => {
    setLoading(true);
    setError(null);
    try {
      const userProfileRef = doc(db, 'userProfiles', uid);
      const docSnap = await getDoc(userProfileRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        setProfileData(data);
        setFormFullName(data.fullName || '');
        setFormEmail(data.email || '');
        setFormUsername(data.username || '');
        setFormTravelStyles(Array.isArray(data.travelStyles) ? data.travelStyles : []);
        setFormInterests(Array.isArray(data.interests) ? data.interests : []);
        setFormBudgetRange(data.budgetRange || '');
        setFormDietaryRestrictions(Array.isArray(data.dietaryRestrictions) ? data.dietaryRestrictions : []);
        setFormProfilePicture(data.profilePicture || '');
      } else {
        setProfileData({ message: "No user profile found. Create one!", isNewUser: true });
        setFormFullName(currentFirebaseUser?.displayName || '');
        setFormEmail(currentFirebaseUser?.email || '');
        setFormUsername(currentFirebaseUser?.email?.split('@')[0].replace(/[^a-z0-9]/gi, '').toLowerCase() || currentFirebaseUser?.displayName?.replace(/\s/g, '').toLowerCase() || '');
        setFormTravelStyles([]);
        setFormInterests([]);
        setFormBudgetRange('');
        setFormDietaryRestrictions([]);
        setFormProfilePicture(currentFirebaseUser?.photoURL || '');
        setIsEditing(true);
      }
    } catch (err) {
      console.error('Error fetching user profile:', err);
      setError('Failed to load user profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setImageSrc(reader.result.toString() || '');
        setCompletedCrop(null);
        setImageUploadError(null);
        setImageUploadSuccess(false);
      });
      reader.readAsDataURL(file);
    }
  };

  const onImageLoad = (e) => {
    const { width, height } = e.currentTarget;
    const crop = centerCrop({
      unit: '%',
      width: 50,
      aspect: 1,
    }, width, height);
    setCrop(crop);
  };

  const handleUploadCroppedImage = async () => {
    if (!completedCrop || !imgRef.current) {
      setImageUploadError("Please select an image and define a crop area first.");
      return;
    }

    setUploadingImage(true);
    setImageUploadError(null);
    setImageUploadSuccess(false);

    try {
      const croppedBlob = await getCroppedImage(imgRef.current, completedCrop);
      const imgbbApiKey = process.env.NEXT_PUBLIC_IMGBB_API_KEY;

      if (!imgbbApiKey) {
        throw new Error("ImgBB API key not configured.");
      }

      const formData = new FormData();
      formData.append('image', croppedBlob);

      const response = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbApiKey}`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        const newPhotoURL = data.data.url;
        setFormProfilePicture(newPhotoURL);
        
        if (currentFirebaseUser) {
            await updateProfile(currentFirebaseUser, {
                photoURL: newPhotoURL
            });
            console.log("Firebase Auth user photoURL updated.");
        }

        setImageUploadSuccess(true);
        setImageSrc(null);
        setCompletedCrop(null);
        console.log("Image uploaded to ImgBB:", newPhotoURL);
      } else {
        throw new Error(data.error.message || "Failed to upload image to ImgBB.");
      }
    } catch (err) {
      console.error('ImgBB upload error:', err);
      setImageUploadError(err.message || 'Image upload failed.');
      setFormProfilePicture('');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!currentFirebaseUser?.uid) {
      setError("No authenticated user to update profile.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const updatePayload = {
        fullName: formFullName,
        email: formEmail,
        username: formUsername,
        travelStyles: formTravelStyles,
        interests: formInterests,
        budgetRange: formBudgetRange,
        dietaryRestrictions: formDietaryRestrictions,
        profilePicture: formProfilePicture
      };

      const response = await fetch(`/api/user-profiles/${currentFirebaseUser.uid}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      console.log('Profile update successful:', result.message);
      setIsEditing(false);
      fetchUserProfile(currentFirebaseUser.uid);
    } catch (err) {
      console.error('Error updating user profile:', err);
      setError('Failed to update profile: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckboxChange = (option, fieldName) => {
    const setStateFunction =
      fieldName === 'travelStyles' ? setFormTravelStyles :
      fieldName === 'interests' ? setFormInterests :
      setFormDietaryRestrictions;

    setStateFunction(prevOptions => {
      if (prevOptions.includes(option)) {
        return prevOptions.filter(item => item !== option);
      } else {
        return [...prevOptions, option];
      }
    });
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setImageUploadError(null);
    setImageUploadSuccess(false);
    setImageSrc(null);
    setCompletedCrop(null);

    if (profileData && !profileData.isNewUser) {
      setFormFullName(profileData.fullName || '');
      setFormEmail(profileData.email || '');
      setFormUsername(profileData.username || '');
      setFormTravelStyles(Array.isArray(profileData.travelStyles) ? profileData.travelStyles : []);
      setFormInterests(Array.isArray(profileData.interests) ? profileData.interests : []);
      setFormBudgetRange(profileData.budgetRange || '');
      setFormDietaryRestrictions(Array.isArray(profileData.dietaryRestrictions) ? profileData.dietaryRestrictions : []);
      setFormProfilePicture(profileData.profilePicture || '');
    } else {
      setFormFullName(currentFirebaseUser?.displayName || '');
      setFormEmail(currentFirebaseUser?.email || '');
      setFormUsername(currentFirebaseUser?.email?.split('@')[0].replace(/[^a-z0-9]/gi, '').toLowerCase() || currentFirebaseUser?.displayName?.replace(/\s/g, '').toLowerCase() || '');
      setFormTravelStyles([]);
      setFormInterests([]);
      setFormBudgetRange('');
      setFormDietaryRestrictions([]);
      setFormProfilePicture(currentFirebaseUser?.photoURL || '');
    }
  };
  
  const renderLoadingOrError = (message) => (
    <div className="min-h-screen font-inter flex flex-col items-center justify-center pt-20 relative z-10 p-4">
        <div className="w-full max-w-md bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/20 shadow-2xl text-center">
            <p className="text-xl text-white">{message}</p>
        </div>
    </div>
  );

  if (!isAuthReady || (loading && !profileData)) {
    return renderLoadingOrError("Loading Profile...");
  }
  
  if (error) {
     return renderLoadingOrError(error);
  }

  if (!currentFirebaseUser) {
    return (
        <div className="min-h-screen font-inter flex flex-col items-center justify-center pt-20 relative z-10 p-4">
            <div className="w-full max-w-md bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/20 shadow-2xl text-center">
                <p className="text-xl text-white mb-6">You must be logged in to view your profile.</p>
                <Link href="/auth/login" passHref>
                    <button className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition-colors">
                        Go to Login
                    </button>
                </Link>
            </div>
        </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 blur -z-10 h-full w-full bg-cover bg-center" style={{ backgroundImage: "url('/assets/profilepage.jpg')" }}></div>
      <div className="fixed inset-x-0 top-0 h-full bg-gradient-to-b from-white-300 to-blue-900 opacity-60 -z-10"></div>
      <div className="fixed top-0 w-full z-50"><NavigationBarLight/></div>

      <div className="min-h-screen font-inter flex flex-col items-center justify-center pt-28 pb-12 px-4 relative z-10">
        <div className="w-full max-w-4xl">
          {!isEditing ? (
            // --- VIEW MODE ---
            <div className="bg-black/50 backdrop-blur-md rounded-2xl p-8 border border-white/20 shadow-2xl">
              <h1 className="text-3xl font-bold text-center text-white mb-2">JourneyScribe User Profile</h1>
              <p className="text-center text-white/70 mb-8">These informations help personalize your travel experience.</p>

              <div className="flex flex-col md:flex-row items-center gap-8">
                <div className="flex-shrink-0 text-center">
                    <img
                        src={formProfilePicture || profileData?.profilePicture || currentFirebaseUser?.photoURL || "https://placehold.co/150x150/1F2937/FFFFFF?text=User"}
                        alt="Profile"
                        className="w-36 h-36 rounded-full object-cover border-4 border-white/30 shadow-xl mx-auto"
                        onError={(e) => { e.target.onerror = null; e.target.src = "https://placehold.co/150x150/1F2937/FFFFFF?text=User"; }}
                    />
                    <button onClick={() => setIsEditing(true)} className="mt-6 w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition-colors">
                        Edit Profile
                    </button>
                </div>
                
                <div className="w-full border-t-2 md:border-t-0 md:border-l-2 border-white/20 pt-6 md:pt-0 md:pl-8">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                        <div>
                            <label className="text-sm text-white/60">Full Name</label>
                            <p className="text-lg font-semibold text-white">{profileData?.fullName || 'N/A'}</p>
                        </div>
                        <div>
                            <label className="text-sm text-white/60">Username</label>
                            <p className="text-lg font-semibold text-white">{profileData?.username || 'N/A'}</p>
                        </div>
                        <div className="col-span-2">
                            <label className="text-sm text-white/60">Email</label>
                            <p className="text-lg font-semibold text-white">{profileData?.email || currentFirebaseUser?.email || 'N/A'}</p>
                        </div>
                    </div>
                    
                    <hr className="border-white/20 my-6" />

                    <div>
                        <h3 className="text-md font-semibold text-white mb-3">Travel Preferences</h3>
                        <div className="space-y-3">
                            <div className="flex flex-wrap gap-2 items-center">
                                <strong className="text-sm text-white/80 w-28">Styles:</strong>
                                {profileData?.travelStyles?.length > 0 ? profileData.travelStyles.map(s => <InfoTag key={s}>{s}</InfoTag>) : <InfoTag>Not set</InfoTag>}
                            </div>
                            <div className="flex flex-wrap gap-2 items-center">
                                <strong className="text-sm text-white/80 w-28">Interests:</strong>
                                {profileData?.interests?.length > 0 ? profileData.interests.map(i => <InfoTag key={i}>{i}</InfoTag>) : <InfoTag>Not set</InfoTag>}
                            </div>
                             <div className="flex flex-wrap gap-2 items-center">
                                <strong className="text-sm text-white/80 w-28">Budget:</strong>
                                {profileData?.budgetRange ? <InfoTag>{profileData.budgetRange}</InfoTag> : <InfoTag>Not set</InfoTag>}
                            </div>
                        </div>
                    </div>
                </div>
              </div>
            </div>
          ) : (
            // --- EDIT MODE ---
            <div className="bg-black/50 backdrop-blur-xl rounded-2xl p-8 border border-white/20 shadow-2xl">
              <h1 className="text-3xl font-bold text-center text-white mb-6">Edit Your Profile</h1>
              <div className="space-y-6">
                
                {/* Text Inputs */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label htmlFor="fullName" className="block text-sm font-medium text-white/80 mb-1">Full Name</label>
                        <input type="text" id="fullName" className="w-full p-3 bg-white/10 border-2 border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400" value={formFullName} onChange={(e) => setFormFullName(e.target.value)} />
                    </div>
                    <div>
                        <label htmlFor="username" className="block text-sm font-medium text-white/80 mb-1">Username</label>
                        <input type="text" id="username" className="w-full p-3 bg-white/10 border-2 border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400" value={formUsername} onChange={(e) => setFormUsername(e.target.value)} />
                    </div>
                     <div className="md:col-span-2">
                        <label htmlFor="email" className="block text-sm font-medium text-white/80 mb-1">Email</label>
                        <input type="email" id="email" className="w-full p-3 bg-white/10 border-2 border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} />
                    </div>
                </div>
                
                {/* Checkbox fields */}
                <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">Travel Styles</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {travelStyleOptions.map(option => (
                            <div key={option} className="flex items-center">
                                <input type="checkbox" id={`travel-${option}`} value={option} checked={formTravelStyles.includes(option)} onChange={() => handleCheckboxChange(option, 'travelStyles')} className="h-4 w-4 text-blue-500 bg-white/20 border-white/30 rounded focus:ring-blue-400" />
                                <label htmlFor={`travel-${option}`} className="ml-2 text-sm text-white/90">{option}</label>
                            </div>
                        ))}
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">Interests</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {interestOptions.map(option => (
                             <div key={option} className="flex items-center">
                                <input type="checkbox" id={`interest-${option}`} value={option} checked={formInterests.includes(option)} onChange={() => handleCheckboxChange(option, 'interests')} className="h-4 w-4 text-blue-500 bg-white/20 border-white/30 rounded focus:ring-blue-400" />
                                <label htmlFor={`interest-${option}`} className="ml-2 text-sm text-white/90">{option}</label>
                            </div>
                        ))}
                    </div>
                </div>
                
                {/* Select Field */}
                <div>
                    <label htmlFor="budgetRange" className="block text-sm font-medium text-white/80 mb-1">Budget Range</label>
                    <select id="budgetRange" className="w-full p-3 rounded-lg bg-white/10 text-white border-2 border-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400" value={formBudgetRange} onChange={(e) => setFormBudgetRange(e.target.value)}>
                        <option value="" className="bg-gray-800">Select a budget range</option>
                        {budgetRangeOptions.map(option => (
                            <option key={option} value={option} className="bg-gray-800">{option}</option>
                        ))}
                    </select>
                </div>
                
                {/* Profile Picture Upload & Crop Section */}
                <div className="p-4 rounded-xl bg-black/20 border border-white/10">
                    <label htmlFor="profilePictureUpload" className="block text-sm font-medium text-white/80 mb-2">Upload New Profile Picture</label>
                    <input type="file" id="profilePictureUpload" accept="image/*" onChange={handleFileChange} className="w-full text-white/80 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-500/50 file:text-white hover:file:bg-blue-500/70 transition-colors"/>
                    {imageSrc && (
                        <>
                            <div className="mt-4 flex justify-center border border-white/20 rounded-md overflow-hidden bg-black/20">
                                <ReactCrop crop={crop} onChange={c => setCrop(c)} onComplete={(c) => setCompletedCrop(c)} aspect={1} circularCrop>
                                    <img ref={imgRef} src={imageSrc} onLoad={onImageLoad} alt="Source" className="max-w-full h-auto" />
                                </ReactCrop>
                            </div>
                            <button onClick={handleUploadCroppedImage} disabled={!completedCrop || uploadingImage} className="mt-4 w-full px-6 py-3 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 transition-colors disabled:bg-gray-500">
                                {uploadingImage ? 'Uploading...' : 'Set Cropped Image'}
                            </button>
                        </>
                    )}
                    {imageUploadError && (<p className="mt-2 text-sm text-red-400">{imageUploadError}</p>)}
                    {imageUploadSuccess && (<p className="mt-2 text-sm text-green-400">Image set successfully! Save your profile to apply.</p>)}
                </div>

                <div className="flex justify-center items-center space-x-4 pt-4">
                    <button onClick={handleUpdateProfile} disabled={loading || uploadingImage} className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition-colors disabled:bg-gray-500">
                        {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button onClick={handleCancelEdit} className="px-8 py-3 bg-white/20 text-white font-semibold rounded-lg hover:bg-white/30 transition-colors" disabled={loading || uploadingImage}>
                        Cancel
                    </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
