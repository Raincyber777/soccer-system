<?php

namespace App\Models;

use App\Traits\HasEncryptedFields;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RegistrationCoach extends Model
{
    use HasEncryptedFields;

    protected $table = 'registration_coaches';

    protected $fillable = [
        'registration_id', 'name', 'id_card', 'phone',
        'certificate_no', 'photo_url', 'role',
    ];

    protected $casts = [
        'registration_id' => 'integer',
    ];

    public function getIdCardAttribute(): ?string
    {
        return $this->getEncryptedField('id_card');
    }

    public function setIdCardAttribute(?string $value): void
    {
        $this->setEncryptedField('id_card', $value);
    }

    public function registration(): BelongsTo
    {
        return $this->belongsTo(Registration::class, 'registration_id');
    }
}
