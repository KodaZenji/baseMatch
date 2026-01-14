interface ProfileFormFieldsProps {
    formData: {
        name: string;
        birthYear: string;
        gender: string;
        interests: string;
    };
    onChange: (field: string, value: string) => void;
}

export default function ProfileFormFields({ formData, onChange }: ProfileFormFieldsProps) {
    return (
        <>
            {/* Name */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => onChange('name', e.target.value)}
                    className="w-full px-4 py-3 text-gray-700 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Your name"
                    required
                />
            </div>

            {/* Birth Year */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Birth Year *</label>
                <select
                    value={formData.birthYear}
                    onChange={(e) => onChange('birthYear', e.target.value)}
                    className="w-full px-4 py-3 border text-gray-700 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                >
                    <option value="">Select birth year</option>
                    {Array.from({ length: 105 }, (_, i) => {
                        const currentYear = new Date().getFullYear();
                        const year = currentYear - i;
                        const calculatedAge = currentYear - year;
                        return calculatedAge >= 18 && calculatedAge <= 120 ? (
                            <option key={year} value={year}>
                                {year} (age {calculatedAge})
                            </option>
                        ) : null;
                    }).filter(Boolean)}
                </select>
            </div>

            {/* Gender */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Gender *</label>
                <select
                    value={formData.gender}
                    onChange={(e) => onChange('gender', e.target.value)}
                    className="w-full px-4 py-3 border text-gray-700 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                >
                    <option value="">Select Gender</option>
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                </select>
            </div>

            {/* Interests */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Interests *</label>
                <textarea
                    value={formData.interests}
                    onChange={(e) => onChange('interests', e.target.value)}
                    className="w-full px-4 py-3 text-gray-700 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Hiking, Photography, Crypto, Art"
                    rows={3}
                    required
                />
            </div>
        </>
    );
}
