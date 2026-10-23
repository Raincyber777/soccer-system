<?php

namespace App\Models;

use App\Traits\AutoFillAuthor;
use App\Traits\HasEncryptedFields;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RegistrationPlayer extends Model
{
    use HasEncryptedFields;

    protected $table = 'registration_players';

    protected $fillable = [
        'registration_id', 'player_id', 'name', 'id_card', 'jersey_no',
        'position', 'phone', 'photo_url', 'age', 'gender',
        'audit_status', 'audit_remark',
    ];

    protected $casts = [
        'registration_id' => 'integer',
        'player_id'       => 'integer',
        'jersey_no'       => 'integer',
        'age'             => 'integer',
        'audit_status'    => 'integer',
    ];

    // ── id_card 加密存储 ──
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
