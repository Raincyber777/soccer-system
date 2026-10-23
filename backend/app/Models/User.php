<?php

namespace App\Models;

use App\Traits\HasEncryptedFields;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Support\Facades\Crypt;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, SoftDeletes, HasEncryptedFields;

    protected $table = 'users';

    protected $fillable = [
        'username', 'password', 'real_name', 'phone', 'id_card',
        'role', 'org_id', 'region_id', 'status', 'last_login_at', 'remark',
    ];

    protected $hidden = ['password'];

    protected $casts = [
        'role'          => 'integer',
        'status'        => 'integer',
        'last_login_at' => 'datetime',
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

    public function region(): BelongsTo
    {
        return $this->belongsTo(Region::class, 'region_id');
    }
}
