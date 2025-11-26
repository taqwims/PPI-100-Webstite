import React from 'react';

const Profile: React.FC = () => {
    return (
        <div className="container mx-auto px-4 py-12">
            <h1 className="text-3xl font-bold text-center mb-12 text-gray-800">Profil Sekolah</h1>

            <div className="space-y-12">
                <section>
                    <h2 className="text-2xl font-bold mb-4 text-primary">Visi</h2>
                    <p className="text-lg text-gray-700 leading-relaxed">
                        Terwujudnya Pesantren Persatuan Islam yang unggul dalam tafaqquh fiddin, sains, dan teknologi, serta melahirkan kader ulama dan zuama yang berakhlakul karimah.
                    </p>
                </section>

                <section>
                    <h2 className="text-2xl font-bold mb-4 text-primary">Misi</h2>
                    <ul className="list-disc list-inside space-y-2 text-gray-700 text-lg">
                        <li>Menyelenggarakan pendidikan kepesantrenan yang berkualitas.</li>
                        <li>Mengembangkan potensi santri dalam bidang sains dan teknologi.</li>
                        <li>Membina akhlak mulia melalui pembiasaan ibadah dan keteladanan.</li>
                        <li>Mempersiapkan kader pemimpin umat yang amanah dan profesional.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-2xl font-bold mb-4 text-primary">Sejarah Singkat</h2>
                    <p className="text-lg text-gray-700 leading-relaxed">
                        Pesantren Persis 100 Banjar­sari didirikan dengan semangat untuk mencerdaskan kehidupan bangsa dan menegakkan syariat Islam. Sejak awal berdirinya, pesantren ini telah berkontribusi dalam melahirkan lulusan yang berkiprah di berbagai bidang, baik keagamaan maupun kemasyarakatan.
                    </p>
                </section>
            </div>
        </div>
    );
};

export default Profile;
