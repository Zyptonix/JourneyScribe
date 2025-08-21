'use client';

import React, { useState, useEffect, useRef } from 'react';
import { auth, db } from '@/lib/firebaseClient';
import { onAuthStateChanged, updateProfile } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import Link from 'next/link';
import NavigationBar from '@/components/NavigationBar';

// Import react-image-crop and its styles
import ReactCrop, {
  Crop,
  PixelCrop,
  centerCrop,
  getImageDimensions
} from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import NavigationBarLight from '@/components/NavigationBarLight';
import NavigationBarDark from '@/components/NavigationBarDark';

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

// Fancy button component with gradient and animation
const GradientButton = ({ onClick, children, disabled, className }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`relative inline-flex items-center justify-center p-0.5 mb-2 me-2 overflow-hidden text-sm font-medium text-gray-900 rounded-full group bg-gradient-to-br from-[#6700a3] to-[#ff5a57] group-hover:from-[#6700a3] group-hover:to-[#ff5a57] hover:text-white dark:text-white focus:ring-4 focus:outline-none focus:ring-purple-200 dark:focus:ring-purple-800 transition-all duration-300 ease-in-out transform hover:scale-105 active:scale-95 ${className}`}
  >
    <span className="relative px-5 py-2.5 transition-all ease-in duration-75 bg-white dark:bg-gray-900 rounded-full group-hover:bg-opacity-0">
      {children}
    </span>
  </button>
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
  const [imageSrc, setImageSrc] = useState(null); // The image data URL to be cropped
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
        
        // --- KEY CHANGE: Update Firebase Auth user object directly ---
        if (currentFirebaseUser) {
            await updateProfile(currentFirebaseUser, {
                photoURL: newPhotoURL
            });
            console.log("Firebase Auth user photoURL updated.");
        }
        // -----------------------------------------------------------------

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

  if (!isAuthReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        <p className="text-xl">Initializing authentication...</p>
      </div>
    );
  }

  if (!currentFirebaseUser) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 p-4">
        <p className="text-xl text-white mb-6">You must be logged in to view your profile.</p>
        <Link href="/auth/login" passHref>
          <GradientButton>
            Go to Login Page
          </GradientButton>
        </Link>
      </div>
    );
  }

  if (loading && !profileData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white">
        <p className="text-xl">Loading profile...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 p-4 text-white">
        <p className="text-xl text-red-400 mb-4">Error: {error}</p>
        <button onClick={() => fetchUserProfile(currentFirebaseUser.uid)} className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-full hover:scale-105 transition-transform">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      <div className="fixed top-0 w-full z-50"><NavigationBarDark/></div>
      <div className="pt-20 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="relative p-6 sm:p-8 w-full max-w-2xl mt-18 rounded-3xl backdrop-blur-md bg-white/10 border border-white/20 shadow-[0_8px_32px_0_rgba(31,38,135,0.37)] animate-fade-in">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-center mb-6 text-transparent bg-clip-text bg-gradient-to-r from-[#e02f75] to-[#ff5a57]">
            User Profile 🚀
          </h1>

          <div className="flex flex-col items-center mb-6">
            <img
              src={formProfilePicture || profileData?.profilePicture || currentFirebaseUser?.photoURL || "https://placehold.co/100x100/1F2937/FFFFFF?text=User"}
              alt="Profile"
              className="w-24 h-24 sm:w-32 sm:h-32 rounded-full object-cover border-4 border-white/50 shadow-xl mb-3 transform transition-transform hover:scale-105 hover:shadow-2xl"
              onError={(e) => { e.target.onerror = null; e.target.src = "https://placehold.co/100x100/1F2937/FFFFFF?text=User"; }}
            />
            <p className="text-xl font-semibold text-white">
              {profileData?.fullName || profileData?.username || currentFirebaseUser?.displayName || 'N/A'}
            </p>
          </div>

          {!isEditing ? (
            // View Mode
            <div className="space-y-4 text-gray-300">
              <div className="w-full h-px bg-gradient-to-r from-transparent via-[#ff5a57] to-transparent my-6"></div>
              <p><span className="font-semibold text-white">Username:</span> {profileData?.username || 'N/A'}</p>
              <p><span className="font-semibold text-white">Full Name:</span> {profileData?.fullName || 'N/A'}</p>
              <p><span className="font-semibold text-white">Email:</span> {profileData?.email || currentFirebaseUser?.email || 'N/A'}</p>
              <p><span className="font-semibold text-white">Travel Styles:</span> {Array.isArray(profileData?.travelStyles) && profileData.travelStyles.length > 0 ? profileData.travelStyles.join(', ') : 'N/A'}</p>
              <p><span className="font-semibold text-white">Interests:</span> {Array.isArray(profileData?.interests) && profileData.interests.length > 0 ? profileData.interests.join(', ') : 'N/A'}</p>
              <p><span className="font-semibold text-white">Budget Range:</span> {profileData?.budgetRange || 'N/A'}</p>
              <p><span className="font-semibold text-white">Dietary Restrictions:</span> {Array.isArray(profileData?.dietaryRestrictions) && profileData.dietaryRestrictions.length > 0 ? profileData.dietaryRestrictions.join(', ') : 'N/A'}</p>
              <p>
                <span className="font-semibold text-white">Member Since:</span>{" "}
                {profileData?.createdAt
                  ? profileData.createdAt.toDate
                    ? profileData.createdAt.toDate().toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "long",
                        day: "numeric"
                      })
                    : new Date(profileData.createdAt._seconds * 1000).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "long",
                        day: "numeric"
                      })
                  : "N/A"}
              </p>

              {profileData?.message && (
                <p className="text-center text-gray-400 italic mt-4">{profileData.message}</p>
              )}

              <div className="text-center mt-6">
                <GradientButton onClick={() => setIsEditing(true)}>
                  Edit Profile
                </GradientButton>
              </div>
            </div>
          ) : (
            // Edit Mode
            <div className="space-y-6">
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-200 mb-1">Full Name</label>
                <input type="text" id="fullName" className="w-full p-3 rounded-lg bg-gray-700 text-white border-2 border-transparent focus:outline-none focus:border-white/20 focus:ring-2 focus:ring-[#ff5a57] transition-all duration-300" value={formFullName} onChange={(e) => setFormFullName(e.target.value)} />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-200 mb-1">Email</label>
                <input type="email" id="email" className="w-full p-3 rounded-lg bg-gray-700 text-white border-2 border-transparent focus:outline-none focus:border-white/20 focus:ring-2 focus:ring-[#ff5a57] transition-all duration-300" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} />
              </div>
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-200 mb-1">Username</label>
                <input type="text" id="username" className="w-full p-3 rounded-lg bg-gray-700 text-white border-2 border-transparent focus:outline-none focus:border-white/20 focus:ring-2 focus:ring-[#ff5a57] transition-all duration-300" value={formUsername} onChange={(e) => setFormUsername(e.target.value)} />
              </div>

              {/* Checkbox fields */}
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">Travel Styles</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {travelStyleOptions.map(option => (
                    <div key={option} className="flex items-center">
                      <input type="checkbox" id={`travel-${option}`} value={option} checked={formTravelStyles.includes(option)} onChange={() => handleCheckboxChange(option, 'travelStyles')} className="h-4 w-4 text-[#ff5a57] bg-gray-700 border-gray-600 rounded focus:ring-[#e02f75]" />
                      <label htmlFor={`travel-${option}`} className="ml-2 text-sm text-gray-300">{option}</label>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">Interests</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {interestOptions.map(option => (
                    <div key={option} className="flex items-center">
                      <input type="checkbox" id={`interest-${option}`} value={option} checked={formInterests.includes(option)} onChange={() => handleCheckboxChange(option, 'interests')} className="h-4 w-4 text-[#ff5a57] bg-gray-700 border-gray-600 rounded focus:ring-[#e02f75]" />
                      <label htmlFor={`interest-${option}`} className="ml-2 text-sm text-gray-300">{option}</label>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label htmlFor="budgetRange" className="block text-sm font-medium text-gray-200 mb-1">Budget Range</label>
                <select id="budgetRange" className="w-full p-3 rounded-lg bg-gray-700 text-white border-2 border-transparent focus:outline-none focus:border-white/20 focus:ring-2 focus:ring-[#ff5a57] transition-all duration-300" value={formBudgetRange} onChange={(e) => setFormBudgetRange(e.target.value)}>
                  <option value="">Select a budget range</option>
                  {budgetRangeOptions.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">Dietary Restrictions</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {dietaryRestrictionsOptions.map(option => (
                    <div key={option} className="flex items-center">
                      <input type="checkbox" id={`dietary-${option}`} value={option} checked={formDietaryRestrictions.includes(option)} onChange={() => handleCheckboxChange(option, 'dietaryRestrictions')} className="h-4 w-4 text-[#ff5a57] bg-gray-700 border-gray-600 rounded focus:ring-[#e02f75]" />
                      <label htmlFor={`dietary-${option}`} className="ml-2 text-sm text-gray-300">{option}</label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Profile Picture Upload & Crop Section */}
              <div className="p-4 rounded-xl backdrop-blur-sm bg-gray-700/50 border border-white/10">
                <label htmlFor="profilePictureUpload" className="block text-sm font-medium text-gray-200 mb-2">Upload New Profile Picture</label>
                <input
                  type="file"
                  id="profilePictureUpload"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="w-full text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-gray-600/50 file:text-white hover:file:bg-gray-600 transition-colors"
                />
                {imageSrc && (
                  <>
                    <div className="mt-4 flex justify-center border border-white/20 rounded-md overflow-hidden">
                      <ReactCrop
                        crop={crop}
                        onChange={c => setCrop(c)}
                        onComplete={(c) => setCompletedCrop(c)}
                        aspect={1}
                        circularCrop
                      >
                        <img ref={imgRef} src={imageSrc} onLoad={onImageLoad} alt="Source" className="max-w-full h-auto" />
                      </ReactCrop>
                    </div>
                    <GradientButton
                      onClick={handleUploadCroppedImage}
                      disabled={!completedCrop || uploadingImage}
                      className="mt-4 w-full"
                    >
                      {uploadingImage ? 'Uploading...' : 'Upload Cropped Image'}
                    </GradientButton>
                  </>
                )}
                {imageUploadError && (<p className="mt-2 text-sm text-red-400">{imageUploadError}</p>)}
                {imageUploadSuccess && (<p className="mt-2 text-sm text-green-400">Image uploaded successfully! URL set. 🎉</p>)}
              </div>

              <div className="flex justify-center space-x-4 mt-6">
                <GradientButton onClick={handleUpdateProfile} disabled={loading || uploadingImage}>
                  {loading ? 'Saving...' : 'Save Changes'}
                </GradientButton>
                <button onClick={handleCancelEdit} className="px-6 py-3 bg-gray-600 text-white font-bold rounded-full hover:bg-gray-700 transition-colors shadow-lg" disabled={loading || uploadingImage}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}